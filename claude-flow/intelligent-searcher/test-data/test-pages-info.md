# Testování .pages souborů

## Podpora .pages formátu

Aplikace nyní podporuje Apple Pages soubory (.pages) s automatickou konverzí na text.

### Jak to funguje:

1. **Upload:** Uživatel nahraje .pages soubor
2. **Konverze:** Server automaticky extrahuje text z .pages formátu
3. **Zpracování:** Text se zpracuje stejně jako u .txt souborů
4. **Vyhledávání:** Funguje identicky s pokročilými AI prompty

### Technické detaily:

- .pages soubory jsou ZIP archivy obsahující XML struktury
- Konverze probíhá na backend serveru
- Podporuje různé verze Pages (novější i starší formáty)
- Automatická detekce kódování pro české znaky
- Fallback mechanismy pro různé struktury XML

### Testování:

Pro testování vytvořte .pages soubor v Apple Pages s obsahem:
- České text s diakritikou
- Různé formáty (rodná čísla, telefony, jména)
- Tabulky a strukturovaný obsah
- Smlouvy a dokumenty

### Poznámka:

Pokud nemáte Apple Pages, můžete:
1. Použít existující .txt testovací soubory
2. Vytvořit .pages soubor na Mac/iOS zařízení
3. Exportovat z jiných editorů do Pages formátu