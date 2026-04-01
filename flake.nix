{
  description = "March Madness Auction";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        pythonEnv = pkgs.python312.withPackages (ps: with ps; [
          fastapi
          uvicorn
          requests
          pydantic
          python-dotenv
          sqlalchemy
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pythonEnv
            pkgs.nodejs_20
            pkgs.nodePackages.npm
            pkgs.awscli2
            pkgs.process-compose
          ];

          shellHook = ''
            echo "March Madness Auction dev shell"
            echo "  nix run .#dev       — start frontend + backend"
            echo "  nix run .#frontend  — start frontend only"
            echo "  nix run .#backend   — start backend only"
          '';
        };
      }
    );
}
