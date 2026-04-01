{ pkgs, ... }:
{
  projectRootFile = "flake.nix";

  # Python
  programs.black.enable = true;
  programs.isort.enable = true;
  programs.mypy = {
    enable = true;
    directories = {
      "deployment" = {
        directory = "deployment";
        modules = [ "stacks" ];
        options = [ "--ignore-missing-imports" ];
      };
    };
  };

  # Rust
  programs.rustfmt.enable = true;

  # JS/TS
  programs.prettier = {
    enable = true;
    includes = [
      "*.ts"
      "*.tsx"
      "*.js"
      "*.jsx"
      "*.json"
    ];
    excludes = [
      "frontend/node_modules/**"
      "package-lock.json"
    ];
  };

  # Nix
  programs.nixfmt.enable = true;
}
