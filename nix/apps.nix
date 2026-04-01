{ pkgs, pythonEnv }:
let
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
    ${pkgs.process-compose}/bin/process-compose up -f process-compose.yaml
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
