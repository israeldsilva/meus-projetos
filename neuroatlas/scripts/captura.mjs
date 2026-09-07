/**
 * Captura a tela do app em execução, para conferência visual.
 *
 * O plano define a verificação visual como critério de conclusão de cada fase:
 * um erro de orientação ou de transform passa em qualquer teste automatizado,
 * mas salta aos olhos numa imagem.
 *
 * Uso (com `npm run dev` rodando):
 *     node scripts/captura.mjs saida.png
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const SAIDA = process.argv[2] || "captura.png";
const URL = process.env.URL || "http://localhost:3000/";

// Em ambientes que já trazem o Chromium instalado (CI, contêiner), usa esse
// binário em vez de exigir `npx playwright install`.
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const navegador = await chromium.launch({
  ...(existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {}),
  // Renderização por software: o ambiente headless não tem GPU.
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const pagina = await navegador.newPage({
  viewport: { width: 1600, height: 950 },
  deviceScaleFactor: 2,
});

const erros = [];
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push(m.text());
});
pagina.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));

await pagina.goto(URL, { waitUntil: "networkidle", timeout: 90000 });

await pagina
  .waitForFunction(() => !document.body.innerText.includes("Carregando o encéfalo"), {
    timeout: 90000,
  })
  .catch(() => console.log("aviso: indicador de carregamento não sumiu"));

// Deixa as luzes, o damping dos controles e o primeiro quadro assentarem.
await pagina.waitForTimeout(3500);

// CLICAR="Tálamo" seleciona a estrutura pela árvore antes da captura, o que
// permite verificar a ficha e o destaque no 3D, e não só o render de repouso.
if (process.env.CLICAR) {
  await pagina.getByRole("button", { name: process.env.CLICAR, exact: false }).first().click();
  await pagina.waitForTimeout(1200);
  console.log("clicado:", process.env.CLICAR);
}

// RAIOX=1 torna o córtex translúcido.
if (process.env.RAIOX) {
  await pagina.getByRole("button", { name: "Raio-X" }).click();
  await pagina.waitForTimeout(1500);
  console.log("raio-X ligado");
}

// CORTE="Sagital" ativa um plano de corte; CORTE_POS ajusta sua posição.
if (process.env.CORTE) {
  await pagina.getByRole("button", { name: "Cortes" }).click();
  await pagina.waitForTimeout(500);
  await pagina.getByRole("button", { name: process.env.CORTE, exact: true }).click();
  await pagina.waitForTimeout(1500);
  if (process.env.CORTE_POS) {
    const eixos = ["Sagital", "Coronal", "Axial"];
    const i = eixos.indexOf(process.env.CORTE);
    // O primeiro controle deslizante do painel é a opacidade do córtex.
    await pagina.locator('input[type="range"]').nth(i + 1).fill(process.env.CORTE_POS);
    await pagina.waitForTimeout(1500);
  }
  console.log("corte:", process.env.CORTE, process.env.CORTE_POS ?? "");
}

// BUSCAR="tálamo" abre a paleta de busca e digita o termo.
if (process.env.BUSCAR) {
  await pagina.keyboard.press("Control+k");
  await pagina.waitForTimeout(400);
  await pagina.keyboard.type(process.env.BUSCAR, { delay: 40 });
  await pagina.waitForTimeout(600);
  console.log("busca:", process.env.BUSCAR);
}

// VISTA="Posterior" aciona um preset de câmera antes da captura.
if (process.env.VISTA) {
  await pagina.getByRole("button", { name: process.env.VISTA, exact: true }).click();
  // Folga generosa: sem GPU, este ambiente renderiza a menos de 1 quadro por
  // segundo, e a transição precisa de alguns quadros para assentar.
  await pagina.waitForTimeout(8000);
  console.log("vista:", process.env.VISTA);
}

if (process.env.ISOLAR) {
  await pagina.getByRole("button", { name: "Isolar no 3D" }).click();
  await pagina.waitForTimeout(1200);
  console.log("isolado");
}

const diagnostico = await pagina.evaluate(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return { canvas: false };
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  return { canvas: true, largura: canvas.width, altura: canvas.height, webgl: !!gl };
});

console.log("diagnóstico:", JSON.stringify(diagnostico));
console.log(
  erros.length ? "erros do console:\n  " + erros.slice(0, 12).join("\n  ") : "erros do console: nenhum",
);

await pagina.screenshot({ path: SAIDA });
console.log("captura:", SAIDA);

await navegador.close();
