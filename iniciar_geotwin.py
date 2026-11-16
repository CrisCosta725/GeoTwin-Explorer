import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Abre GeoTwin en este equipo.")
    parser.add_argument("--puerto", type=int, default=8000, help="Puerto local (8000 por defecto).")
    parser.add_argument("--sin-abrir", action="store_true", help="Muestra el enlace sin abrir el navegador.")
    options = parser.parse_args()
    if not 1 <= options.puerto <= 65535:
        parser.error("Indica un puerto entre 1 y 65535.")

    atlas = Path(__file__).resolve().parent / "dist"
    if not (atlas / "index.html").is_file():
        parser.exit(1, "Falta dist/index.html. Extrae todo el ZIP antes de iniciar GeoTwin.\n")

    handler = partial(SimpleHTTPRequestHandler, directory=str(atlas))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", options.puerto), handler)
    except OSError as error:
        parser.exit(1, f"No se pudo iniciar el servidor local ({error}). Prueba con --puerto 8001.\n")

    with server:
        url = f"http://127.0.0.1:{options.puerto}/"
        print(f"GeoTwin Explorer v24\nAbre {url}\nPresiona Ctrl+C para cerrar.", flush=True)
        if not options.sin_abrir:
            try:
                webbrowser.open(url)
            except webbrowser.Error:
                pass
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nGeoTwin se cerró.")


if __name__ == "__main__":
    main()
