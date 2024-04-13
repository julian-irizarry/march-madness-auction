# March Madness Auction



## Getting Started

Docker based development and setup.

To build the project:

```bash
docker compose build
```

## Local Development

Install dev packages
``` pip install -r requirements-dev.txt```

Install pre-commit hooks
```pre-commit install```
This will create a hook file at `.git/hooks/pre-commit.`

[pre-commit documentation](https://pre-commit.com/)

pre-commit will run against all staged files when you run `git commit`
To run pre-commit against all files run
```pre-commit run --all-files```


## Usage

```bash
./dev_start.sh
```
This will start a tmux session with two panes. Each pane corresponds to a container. Log output will print here.

The directories are mounted and the containers automatically refresh changes on write.

```bash
docker compose exec frontend /bin/bash
```

The above command will allow you to attach to the shell of a running container. This will be useful if you need to install packages. npm will automatically track the installed packages, but python will not. Ensure that you place python packages in ```backend/requirements.txt```.

You can also use VSCode for development. Once the containers are running, you can use the container and docker plugins to attach to the running containers.
