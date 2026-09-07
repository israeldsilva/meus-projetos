import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three e drei publicam ESM moderno; deixar o Next transpilá-los evita
  // problemas de interop no build de produção.
  transpilePackages: ["three"],

  // O indicador de desenvolvimento fica sobre o painel da árvore e polui as
  // capturas de verificação.
  devIndicators: false,
};

export default nextConfig;
