{ pkgs, pythonEnv }:
let
  processComposeConfig = (pkgs.formats.yaml { }).generate "process-compose.yaml" {
    version = "0.5";
    processes = {
      backend = {
        command = "${pythonEnv}/bin/python main.py";
        working_dir = "./backend";
        environment = [
          "VITE_BACKEND_HOST=127.0.0.1"
          "VITE_BACKEND_PORT=8000"
        ];
        readiness_probe = {
          http_get = {
            host = "127.0.0.1";
            port = 8000;
            path = "/docs";
          };
          initial_delay_seconds = 2;
          period_seconds = 5;
        };
      };
      frontend = {
        command = "${pkgs.nodejs_20}/bin/npm install && ${pkgs.nodejs_20}/bin/npm run dev";
        working_dir = "./frontend";
        environment = [
          "VITE_BACKEND_HOST=127.0.0.1"
          "VITE_BACKEND_PORT=8000"
        ];
      };
    };
  };

  frontendApp = pkgs.writeShellScriptBin "run-frontend" ''
    REPO_ROOT="''${FLAKE_ROOT:-$(${pkgs.git}/bin/git rev-parse --show-toplevel)}"
    cd "$REPO_ROOT/frontend"
    ${pkgs.nodejs_20}/bin/npm install
    ${pkgs.nodejs_20}/bin/npm run dev
  '';

  backendApp = pkgs.writeShellScriptBin "run-backend" ''
    REPO_ROOT="''${FLAKE_ROOT:-$(${pkgs.git}/bin/git rev-parse --show-toplevel)}"
    cd "$REPO_ROOT/backend"
    ${pythonEnv}/bin/python main.py
  '';

  devApp = pkgs.writeShellScriptBin "run-dev" ''
    REPO_ROOT="''${FLAKE_ROOT:-$(${pkgs.git}/bin/git rev-parse --show-toplevel)}"
    cd "$REPO_ROOT"
    ${pkgs.process-compose}/bin/process-compose up -f ${processComposeConfig}
  '';
in
{
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
}
