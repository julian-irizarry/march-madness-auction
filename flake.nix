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

        frontendApp = pkgs.writeShellScriptBin "run-frontend" ''
          cd ${toString ./.}/frontend
          ${pkgs.nodejs_20}/bin/npm run dev
        '';

        backendApp = pkgs.writeShellScriptBin "run-backend" ''
          cd ${toString ./.}/backend
          ${pythonEnv}/bin/python main.py
        '';

        devApp = pkgs.writeShellScriptBin "run-dev" ''
          cd ${toString ./.}
          ${pkgs.process-compose}/bin/process-compose up -f process-compose.yaml
        '';
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

        apps = {
          frontend = {
            type = "app";
            program = "${frontendApp}/bin/run-frontend";
          };
          backend = {
            type = "app";
            program = "${backendApp}/bin/run-backend";
          };
          dev = {
            type = "app";
            program = "${devApp}/bin/run-dev";
          };
          default = {
            type = "app";
            program = "${devApp}/bin/run-dev";
          };
        };
      }
    );
}
