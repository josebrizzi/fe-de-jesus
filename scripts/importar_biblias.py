import sqlite3
import xml.etree.ElementTree as ET
from pathlib import Path
import re

BASE_DIR = Path("/home/iglesia_jcpcentro/Descargas/18 BIBLIAS PARA HOLYRICS .xml")
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "biblia.db"

BIBLIAS = {
    "Reina-Valera 1960": BASE_DIR / "Reina-Valera 1960.xml",
    "Dios Habla Hoy": BASE_DIR / "Biblia Dios Habla Hoy.xml",
    "Traducción en Lenguaje Actual": BASE_DIR / "Traducción en Lenguaje Actual.xml",
    "Nueva Traducción Viviente": BASE_DIR / "Nueva Traducción Viviente.xml",
}


def limpiar_texto(texto):
    if not texto:
        return ""

    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()


def importar_biblia(conn, nombre_version, archivo):
    print()
    print("=" * 60)
    print(f"IMPORTANDO: {nombre_version}")
    print(f"ARCHIVO:    {archivo}")
    print("=" * 60)

    if not archivo.exists():
        print(f"ERROR: No existe el archivo: {archivo}")
        return 0

    tree = ET.parse(archivo)
    root = tree.getroot()

    cursor = conn.cursor()

    # Evita duplicar una versión si ejecutamos nuevamente el importador.
    cursor.execute(
        "DELETE FROM verses WHERE version = ?",
        (nombre_version,)
    )

    cantidad = 0

    for book in root.findall("BIBLEBOOK"):
        book_number = int(book.attrib.get("bnumber", "0"))
        book_name = book.attrib.get("bname", "").strip()

        for chapter in book.findall("CHAPTER"):
            chapter_number = int(chapter.attrib.get("cnumber", "0"))

            for verse in chapter.findall("VERS"):
                verse_number = int(verse.attrib.get("vnumber", "0"))

                texto = "".join(verse.itertext())
                texto = limpiar_texto(texto)

                if not texto:
                    continue

                cursor.execute(
                    """
                    INSERT INTO verses
                    (version, book_number, book_name, chapter, verse, text)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        nombre_version,
                        book_number,
                        book_name,
                        chapter_number,
                        verse_number,
                        texto,
                    ),
                )

                cantidad += 1

    conn.commit()

    print(f"Versículos importados: {cantidad}")
    return cantidad


def main():
    print()
    print("==============================================")
    print("       BIBLIA SINCRONIZADA - IMPORTADOR")
    print("==============================================")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)

    try:
        total = 0

        for nombre_version, archivo in BIBLIAS.items():
            total += importar_biblia(
                conn,
                nombre_version,
                archivo
            )

        print()
        print("==============================================")
        print(f"TOTAL DE VERSÍCULOS IMPORTADOS: {total}")
        print("==============================================")
        print()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
