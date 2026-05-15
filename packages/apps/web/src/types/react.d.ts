import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    shuffle?: string;
    "preload-section"?: string;
    "fs-scrolldisable-element"?: string;
  }
}
