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

        # Frontend: build static assets with Vite
        frontendBuild = pkgs.buildNpmPackage {
          pname = "march-madness-frontend";
          version = "0.1.0";
          src = ./frontend;
          npmDepsHash = "";
          VITE_BACKEND_HOST = "mmauctiongame.com";
          VITE_BACKEND_PORT = "443";
          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';
        };

        # Nginx config for serving the SPA
        nginxConf = pkgs.writeText "nginx.conf" ''
          worker_processes 1;
          daemon off;
          error_log /dev/stderr;
          pid /tmp/nginx.pid;

          events {
            worker_connections 1024;
          }

          http {
            include ${pkgs.nginx}/conf/mime.types;
            default_type application/octet-stream;
            access_log /dev/stdout;
            sendfile on;

            server {
              listen 3000;
              root /var/www;

              location / {
                try_files $uri $uri/ /index.html;
              }
            }
          }
        '';

        # Docker image: frontend (Nginx serving static files)
        frontendImage = pkgs.dockerTools.buildImage {
          name = "march-madness-frontend";
          tag = "latest";

          copyToRoot = pkgs.buildEnv {
            name = "frontend-root";
            paths = [
              pkgs.fakeNss
              pkgs.coreutils
              pkgs.bashInteractive
              pkgs.nginx
            ];
          };

          runAsRoot = ''
            mkdir -p /var/www /var/log/nginx /var/cache/nginx /tmp
            cp -r ${frontendBuild}/* /var/www/
          '';

          config = {
            Cmd = [ "${pkgs.nginx}/bin/nginx" "-c" nginxConf ];
            ExposedPorts = {
              "3000/tcp" = {};
            };
          };
        };

        # Docker image: backend (Python FastAPI with uvicorn)
        backendImage = pkgs.dockerTools.buildImage {
          name = "march-madness-backend";
          tag = "latest";

          copyToRoot = pkgs.buildEnv {
            name = "backend-root";
            paths = [
              pkgs.fakeNss
              pkgs.coreutils
              pkgs.bashInteractive
              pythonEnv
            ];
          };

          runAsRoot = ''
            mkdir -p /app
            cp -r ${./backend}/* /app/
          '';

          config = {
            Cmd = [ "${pythonEnv}/bin/uvicorn" "app.api:app" "--host" "0.0.0.0" "--port" "8000" ];
            WorkingDir = "/app";
            Env = [
              "ENVIRONMENT=production"
            ];
            ExposedPorts = {
              "8000/tcp" = {};
            };
          };
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pythonEnv
            pkgs.nodejs_20
            pkgs.nodePackages.npm
            pkgs.awscli2
            pkgs.process-compose
            pkgs.nodePackages.aws-cdk
            pkgs.python312Packages.pip
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

        packages = {
          frontend-image = frontendImage;
          backend-image = backendImage;
          default = backendImage;
        };
      }
    );
}
