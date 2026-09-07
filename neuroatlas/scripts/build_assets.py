#!/usr/bin/env python3
"""Converte as malhas STL do BodyParts3D no GLB único que o Neuroatlas carrega.

Lê a lista de estruturas de src/dados/estruturas.json, processa cada malha e
escreve public/modelos/encefalo.glb com um nó nomeado por FMA ID.

O acervo BodyParts3D não é versionado aqui (são ~1,8 GB). Para obtê-lo:

    git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D

E aponte para ele com --acervo ou a variável BODYPARTS3D.

Uso:
    python scripts/build_assets.py --acervo /caminho/para/BodyParts3D
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import trimesh

RAIZ = Path(__file__).resolve().parent.parent
ESTRUTURAS = RAIZ / "src" / "dados" / "estruturas.json"
SAIDA = RAIZ / "public" / "modelos" / "encefalo.glb"

# Orçamento de triângulos por malha. Acima disso a malha é decimada.
#
# Com 100 malhas, o total é o que decide se o atlas roda bem no celular. As
# estruturas são superfícies orgânicas e lisas, que toleram bem a decimação —
# o custo em fidelidade é pequeno perto do ganho em fluidez.
LIMITE_FACES = 15_000

# O cerebelo precisa de mais orçamento: suas folhas (folia) são detalhe fino e
# viram um borrão se a decimação for agressiva demais.
LIMITES_ESPECIAIS = {"FMA67944": 30_000}

# Aresta do cubo que envolve o conjunto, em unidades de cena. O encéfalo inteiro
# passa a caber num volume de ~2 unidades, escala confortável para a câmera.
TAMANHO_ALVO = 2.0

# --------------------------------------------------------------------------
# Orientação dos eixos
#
# O BodyParts3D usa a convenção LPS, verificada empiricamente sobre o acervo
# comparando centroides de estruturas de posição conhecida:
#
#     +X = esquerda      +Y = posterior      +Z = superior
#
# O glTF/Three.js usa Y para cima. Queremos, na cena:
#
#     +X = esquerda      +Y = superior       +Z = anterior
#
# ATENÇÃO — este é o ponto onde é fácil destruir a anatomia sem perceber:
# mapear "anterior" para +Z mantendo "direita" em +X produz uma matriz de
# determinante -1, ou seja, uma REFLEXÃO. O encéfalo renderizaria espelhado e
# os hemisférios apareceriam trocados — um erro silencioso, visualmente
# plausível e desastroso num material de estudo.
#
# A matriz abaixo é uma rotação pura de -90° em torno de X (determinante +1),
# e por isso preserva a lateralidade. Como consequência, +X permanece sendo a
# esquerda anatômica: numa vista anterior a esquerda da paciente aparece à
# direita da tela, exatamente como ao olhar alguém de frente.
# --------------------------------------------------------------------------
ROTACAO_LPS_PARA_CENA = np.array(
    [
        [1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0],
        [0.0, -1.0, 0.0],
    ]
)


def carregar_estruturas() -> list[dict]:
    with open(ESTRUTURAS, encoding="utf-8") as f:
        return json.load(f)


def fma_ids(estruturas: list[dict]) -> list[str]:
    return [malha["fma"] for e in estruturas for malha in e["malhas"]]


def localizar_acervo(arg: str | None) -> Path:
    bruto = arg or os.environ.get("BODYPARTS3D")
    if not bruto:
        sys.exit(
            "Informe o acervo BodyParts3D com --acervo ou a variável BODYPARTS3D.\n"
            "Obtenha-o com:\n"
            "  git clone --depth 1 "
            "https://github.com/Kevin-Mattheus-Moerman/BodyParts3D"
        )

    base = Path(bruto).expanduser().resolve()
    stl = base / "assets" / "BodyParts3D_data" / "stl"
    if not stl.is_dir():
        # Aceita também um caminho apontado direto para a pasta stl.
        stl = base if base.name == "stl" and base.is_dir() else stl
    if not stl.is_dir():
        sys.exit(f"Pasta de malhas não encontrada em {stl}")
    return stl


def decimar(malha: trimesh.Trimesh, limite: int) -> trimesh.Trimesh:
    """Reduz a contagem de faces preservando a forma geral."""
    faces_atuais = len(malha.faces)
    if faces_atuais <= limite:
        return malha

    import fast_simplification

    reducao = 1.0 - (limite / faces_atuais)
    vertices, faces = fast_simplification.simplify(
        malha.vertices.astype(np.float32),
        malha.faces.astype(np.int32),
        reducao,
    )
    return trimesh.Trimesh(vertices=vertices, faces=faces, process=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--acervo", help="Raiz do repositório BodyParts3D")
    parser.add_argument(
        "--saida", default=str(SAIDA), help="Caminho do GLB de saída"
    )
    args = parser.parse_args()

    stl_dir = localizar_acervo(args.acervo)
    estruturas = carregar_estruturas()
    ids = fma_ids(estruturas)

    print(f"Acervo: {stl_dir}")
    print(f"Estruturas: {len(estruturas)} ({len(ids)} malhas)\n")

    # ---- 1. Carregar e decimar -------------------------------------------
    malhas: dict[str, trimesh.Trimesh] = {}
    relatorio: list[tuple[str, int, int]] = []

    for fma in ids:
        caminho = stl_dir / f"{fma}.stl"
        if not caminho.is_file():
            sys.exit(f"Malha ausente no acervo: {caminho}")

        # process=True funde vértices duplicados. É o que permite calcular
        # normais suaves depois — sem isso o STL renderiza facetado.
        malha = trimesh.load(caminho, process=True)
        antes = len(malha.faces)

        malha = decimar(malha, LIMITES_ESPECIAIS.get(fma, LIMITE_FACES))
        depois = len(malha.faces)

        malhas[fma] = malha
        relatorio.append((fma, antes, depois))
        print(f"  {fma:14s} {antes:>7,} → {depois:>7,} faces")

    # ---- 2. Transform global ---------------------------------------------
    # Um único transform para TODAS as malhas. Calcular um por malha
    # centralizaria cada estrutura na origem e destruiria as posições
    # anatômicas relativas — que são justamente o valor do atlas.
    cantos = np.vstack([m.bounds for m in malhas.values()])
    minimo, maximo = cantos.min(axis=0), cantos.max(axis=0)
    centro = (minimo + maximo) / 2.0
    extensao = maximo - minimo
    escala = TAMANHO_ALVO / float(extensao.max())

    print(f"\nExtensão original (mm): {np.round(extensao, 1)}")
    print(f"Centro: {np.round(centro, 1)}   escala: {escala:.5f}")

    matriz = np.eye(4)
    matriz[:3, :3] = ROTACAO_LPS_PARA_CENA * escala
    matriz[:3, 3] = -(ROTACAO_LPS_PARA_CENA @ centro) * escala

    assert np.linalg.det(ROTACAO_LPS_PARA_CENA) > 0, (
        "A matriz de orientação espelharia a anatomia — hemisférios trocados."
    )

    # ---- 3. Montar a cena -------------------------------------------------
    cena = trimesh.Scene()
    for fma, malha in malhas.items():
        malha.apply_transform(matriz)
        malha.vertex_normals  # força o cálculo das normais suaves
        cena.add_geometry(malha, geom_name=fma, node_name=fma)

    saida = Path(args.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_bytes(cena.export(file_type="glb"))

    total_faces = sum(depois for _, _, depois in relatorio)
    total_antes = sum(antes for _, antes, _ in relatorio)
    mb = saida.stat().st_size / 1024 / 1024

    print(f"\nFaces: {total_antes:,} → {total_faces:,}")
    print(f"Escrito: {saida}  ({mb:.1f} MB, antes da compressão Draco)")
    print("\nComprima com:")
    print(f"  npx @gltf-transform/cli optimize {saida} {saida} --compress draco")


if __name__ == "__main__":
    main()
