import os
import typer
from PyInstaller import __main__ as pyi

typer = typer.Typer()

CUR_PATH = os.path.dirname(os.path.abspath(__file__))


@typer.command()
def start():
    from main import app
    app.run(debug=app.config.get('DEBUG') or False, host=app.config.get('HOST') or '0.0.0.0',
            port=app.config.get('PORT') or 5708)


@typer.command()
def build():
    if not os.path.exists("./main.spec"):
        pyi.run(["-F", '--add-data', 'templates:templates', "main.py"])
    pyi.run(['main.spec'])


if __name__ == "__main__":
    typer()
