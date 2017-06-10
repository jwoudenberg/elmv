# elmv
Automatically call the right versions of `elm`, `elm-format`, and `elm-test` when switching between projects.

## Installation
Remove any currently installed versions of `elm`, `elm-format`, and `elm-test`.
Clone this repo.
In the repo, run `npm link`.

This will become slightly easier once this package is published on NPM.

## Usage
After installation running one of these commands in any directory will run the version of the command specified in the `elmv.json` in that directory, falling back to the latest available version of the command.

If a required version is not installed in your machine it will automatically be downloaded and installed prior to running.

## TODO:
- [ ] Pass `elm-format` the right `--elm-version` parameter.
