{
  pkgs,
  pythonEnv,
  frontendSrc,
  backendSrc,
}:
let
  # Frontend: build static assets with Vite
  frontendBuild = pkgs.buildNpmPackage {
    pname = "march-madness-frontend";
    version = "0.1.0";
    src = frontendSrc;
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

  # Nginx config for serving the SPA
  nginxConf = pkgs.writeText "nginx.conf" ''
    user root root;
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

  # Prepare frontend web root and nginx dirs
  frontendWebRoot = pkgs.runCommand "frontend-web-root" { } ''
    mkdir -p $out/var/www $out/var/log/nginx $out/var/cache/nginx $out/tmp
    cp -r ${frontendBuild}/* $out/var/www/
  '';

  # Prepare backend app files
  backendAppRoot = pkgs.runCommand "backend-app" { } ''
    mkdir -p $out/app $out/tmp
    cp -r ${backendSrc}/* $out/app/
  '';
in
{
  frontend = pkgs.dockerTools.buildImage {
    name = "march-madness-frontend";
    tag = "latest";

    copyToRoot = pkgs.buildEnv {
      name = "frontend-root";
      paths = [
        pkgs.fakeNss
        pkgs.coreutils
        pkgs.bashInteractive
        pkgs.nginx
        frontendWebRoot
      ];
    };

    config = {
      Cmd = [
        "${pkgs.nginx}/bin/nginx"
        "-e"
        "/dev/stderr"
        "-c"
        nginxConf
      ];
      ExposedPorts = {
        "3000/tcp" = { };
      };
    };
  };

  backend = pkgs.dockerTools.buildImage {
    name = "march-madness-backend";
    tag = "latest";

    copyToRoot = pkgs.buildEnv {
      name = "backend-root";
      paths = [
        pkgs.fakeNss
        pkgs.coreutils
        pkgs.bashInteractive
        pythonEnv
        backendAppRoot
      ];
    };

    config = {
      Cmd = [
        "${pythonEnv}/bin/uvicorn"
        "app.api:app"
        "--host"
        "0.0.0.0"
        "--port"
        "8000"
      ];
      WorkingDir = "/app";
      Env = [
        "ENVIRONMENT=production"
      ];
      ExposedPorts = {
        "8000/tcp" = { };
      };
    };
  };
}
