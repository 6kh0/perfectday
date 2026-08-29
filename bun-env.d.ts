declare module "*.svg" {
  const path: `${string}.svg`;
  export = path;
}

declare module "*.png" {
  const path: `${string}.png`;
  export = path;
}

declare module "*.css" {}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export = classes;
}
