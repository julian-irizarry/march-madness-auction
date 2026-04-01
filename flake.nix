{
  description = "March Madness Auction";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    git-hooks.url = "github:cachix/git-hooks.nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      treefmt-nix,
      git-hooks,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

        treefmtEval = treefmt-nix.lib.evalModule pkgs ./treefmt.nix;

        gitHooksCheck = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            treefmt = {
              enable = true;
              package = treefmtEval.config.build.wrapper;
            };
          };
        };

        pythonEnv = pkgs.python312.withPackages (
          ps: with ps; [
            fastapi
            uvicorn
            requests
            pydantic
            python-dotenv
            sqlalchemy
          ]
        );

        frontendBuild = pkgs.buildNpmPackage {
          pname = "march-madness-frontend";
          version = "0.1.0";
          src = ./frontend;
          npmDepsHash = "sha256-fRPYGR0dgs9LRx5zyriya06LEXtlAXt5EI5mNzekAOw=";
          npmDepsFetcherVersion = 2;
          makeCacheWritable = true;
          npmFlags = [ "--legacy-peer-deps" ];
          VITE_BACKEND_HOST = "mmauctiongame.com";
          VITE_BACKEND_PORT = "443";
          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';
        };

        images = import ./nix/images.nix {
          inherit pkgs pythonEnv frontendBuild;
          backendSrc = ./backend;
        };

        apps = import ./nix/apps.nix { inherit pkgs pythonEnv; };
      in
      {
        devShells.default = pkgs.mkShell {
          inherit (gitHooksCheck) shellHook;
          buildInputs = [
            pythonEnv
            pkgs.nodejs_20
            pkgs.nodePackages.npm
            pkgs.awscli2
            pkgs.process-compose
            pkgs.nodePackages.aws-cdk
            pkgs.python312Packages.pip
            treefmtEval.config.build.wrapper
          ]
          ++ gitHooksCheck.enabledPackages;
        };

        formatter = treefmtEval.config.build.wrapper;

        checks = {
          formatting = treefmtEval.config.build.check self;
          git-hooks = gitHooksCheck;
        };

        inherit apps;

        packages = {
          frontend-image = images.frontend;
          backend-image = images.backend;
          default = images.backend;
        };
      }
    );
}
