// client.js (Versión Estática - Solo localStorage)
document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('dataTableBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    const LOCAL_STORAGE_KEY = 'colorContrastAppDataStatic'; // Clave para guardar/cargar datos

    // --- DATOS PREDETERMINADOS (si localStorage está vacío) ---
    const defaultData = [
        {
            "id": "1746135061559",
            "nombre": "Boton ACCEDER",
            "colorFondo": "#FFD9A0",
            "colorFuente": "#4F422F"
        },
        {
            "id": "1746135061560",
            "nombre": "Boton REGISTRO",
            "colorFondo": "#4F422F",
            "colorFuente": "#FFD9A0"
        },
        {
            "id": "1746135061561",
            "nombre": "Boton ACCION",
            "colorFondo": "#A4F245",
            "colorFuente": "#4F422F"
        }
    ];

    // --- DATA STORAGE ---

    function saveDataToLocalStorage(data) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            console.log('Datos guardados en localStorage');
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    function loadDataFromLocalStorage() {
        try {
            const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedData) {
                console.log('Datos cargados desde localStorage');
                const parsedData = JSON.parse(storedData);
                // Asegurarse de que sea un array, si no, devolver null
                return Array.isArray(parsedData) ? parsedData : null;
            }
        } catch (error) {
            console.error('Error al cargar desde localStorage:', error);
        }
        return null; // Devuelve null si no hay datos o hay error
    }

    // Obtiene los datos directamente de la estructura de la tabla HTML
    function getDataFromTable() {
        const data = [];
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(rowElement => {
            const id = rowElement.getAttribute('data-id');
            const nombreInput = rowElement.querySelector('input[data-field="nombre"]');
            const colorFondoInput = rowElement.querySelector('input[data-field="colorFondo"]');
            const colorFuenteInput = rowElement.querySelector('input[data-field="colorFuente"]');

            // Asegurarse que todos los elementos existen antes de añadir
            if (id && nombreInput && colorFondoInput && colorFuenteInput) {
                data.push({
                    id: id,
                    nombre: nombreInput.value,
                    colorFondo: colorFondoInput.value,
                    colorFuente: colorFuenteInput.value
                });
            } else {
                console.warn('Saltando fila por elementos faltantes:', rowElement);
            }
        });
        return data;
    }


    // --- CONTRASTE WCAG (Sin cambios) ---

    function parseHexColor(hex) {
        if (!hex || typeof hex !== 'string') return null;
        let cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
        let r, g, b;
        if (cleanHex.length === 3) {
            [r, g, b] = cleanHex.split('').map(c => parseInt(c + c, 16));
        } else if (cleanHex.length === 6) {
            r = parseInt(cleanHex.substring(0, 2), 16);
            g = parseInt(cleanHex.substring(2, 4), 16);
            b = parseInt(cleanHex.substring(4, 6), 16);
        } else { return null; }
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return { r: r / 255, g: g / 255, b: b / 255 };
    }

    function getRelativeLuminance(rgb) {
        if (!rgb) return -1;
        const transform = (c) => (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
        return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
    }

    function getWCAGContrastRatio(hexColor1, hexColor2) {
        const lum1 = getRelativeLuminance(parseHexColor(hexColor1));
        const lum2 = getRelativeLuminance(parseHexColor(hexColor2));
        if (lum1 === -1 || lum2 === -1) return -1;
        const L1 = Math.max(lum1, lum2);
        const L2 = Math.min(lum1, lum2);
        return (L1 + 0.05) / (L2 + 0.05);
    }

    function updateContrastCell(contrastCell, bgColorHex, fgColorHex) {
        const ratio = getWCAGContrastRatio(bgColorHex, fgColorHex);
        let contentHTML = '';
        contrastCell.classList.remove('wcag-error', 'wcag-pass', 'wcag-fail'); // Limpiar clases previas

        if (ratio === -1) {
            contentHTML = `<span>WCAG AA: <span class="wcag-error">Error</span></span><br><span>WCAG AAA: <span class="wcag-error">Error</span></span>`;
            contrastCell.classList.add('wcag-error');
        } else {
            const aaPass = ratio >= 4.5;
            const aaaPass = ratio >= 7.0;
            const ratioFormatted = ratio.toFixed(2) + ':1';
            contentHTML = `
                <span>WCAG AA: <span class="${aaPass ? 'wcag-pass' : 'wcag-fail'}">${aaPass ? 'Pass' : 'Fail'}</span></span><br>
                <span>WCAG AAA: <span class="${aaaPass ? 'wcag-pass' : 'wcag-fail'}">${aaaPass ? 'Pass' : 'Fail'}</span></span><br>
                <span style="font-size: 0.8em; color: #555;">(${ratioFormatted})</span>`;
        }
        contrastCell.innerHTML = contentHTML;
    }

    // --- UI RENDERING & UPDATES ---

    function updatePreviewStyle(previewCell, bgColor, fontColor) {
        const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
        previewCell.style.backgroundColor = hexColorRegex.test(bgColor) ? bgColor : '#FFFFFF'; // Fondo blanco si inválido
        previewCell.style.color = hexColorRegex.test(fontColor) ? fontColor : '#000000'; // Texto negro si inválido
    }

    function formatHexInput(inputElement) {
        let value = inputElement.value.trim();
        if (!value.startsWith('#')) value = '#' + value;
        value = value.replace(/[^#0-9A-Fa-f]/g, '').substring(0, 7);
        inputElement.value = value;
        return value;
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        if (!data || data.length === 0) {
             // Opcional: Mostrar un mensaje si no hay datos
            // tableBody.innerHTML = '<tr><td colspan="5">No hay datos. Añade una fila o importa datos.</td></tr>';
            console.log("No hay datos para renderizar o array vacío.");
            return;
        }

        data.forEach((row) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id || `client-fallback-${Date.now()}-${Math.random()}`); // ID fallback

            // Nombre
            const tdNombre = document.createElement('td');
            const inputNombre = document.createElement('input');
            inputNombre.type = 'text';
            inputNombre.value = row.nombre;
            inputNombre.setAttribute('data-field', 'nombre');
            tdNombre.appendChild(inputNombre);
            tr.appendChild(tdNombre);

            // Helper Inputs Color (Texto y Picker)
            const createColorInputGroup = (fieldName, initialValue) => {
                const td = document.createElement('td');
                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.value = initialValue;
                textInput.setAttribute('data-field', fieldName);
                formatHexInput(textInput); // Formato inicial

                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.value = parseHexColor(textInput.value) ? textInput.value : '#000000';
                colorPicker.style.marginLeft = '5px';
                colorPicker.setAttribute('aria-label', `Selector de color para ${fieldName}`);

                colorPicker.addEventListener('input', (e) => {
                    textInput.value = e.target.value;
                    textInput.dispatchEvent(new Event('change', { bubbles: true }));
                });

                textInput.addEventListener('change', (e) => {
                    const formattedValue = formatHexInput(e.target);
                    if (parseHexColor(formattedValue)) colorPicker.value = formattedValue;
                    const rowElement = e.target.closest('tr');
                    if(rowElement) triggerRowUpdate(rowElement);
                });

                td.appendChild(textInput);
                td.appendChild(colorPicker);
                return td;
            };

            // Color Fondo y Fuente
            tr.appendChild(createColorInputGroup('colorFondo', row.colorFondo));
            tr.appendChild(createColorInputGroup('colorFuente', row.colorFuente));

            // Previsualización
            const tdPreview = document.createElement('td');
            tdPreview.textContent = 'Texto Ejemplo';
            tdPreview.classList.add('preview-cell');
            updatePreviewStyle(tdPreview, row.colorFondo, row.colorFuente);
            tr.appendChild(tdPreview);

            // Contraste
            const tdContrast = document.createElement('td');
            tdContrast.classList.add('contrast-cell');
            updateContrastCell(tdContrast, row.colorFondo, row.colorFuente);
            tr.appendChild(tdContrast);

            tableBody.appendChild(tr);
        });
    }

    // Dispara la actualización de la fila y guarda en localStorage
    function triggerRowUpdate(rowElement) {
        const currentData = getDataFromTable(); // Obtiene todos los datos actuales
        const rowId = rowElement.getAttribute('data-id');

        // Encuentra los datos específicos de esta fila para actualizar preview/contrast
        const rowData = currentData.find(r => r.id === rowId);
        if (rowData) {
            const previewCell = rowElement.querySelector('.preview-cell');
            const contrastCell = rowElement.querySelector('.contrast-cell');
            updatePreviewStyle(previewCell, rowData.colorFondo, rowData.colorFuente);
            updateContrastCell(contrastCell, rowData.colorFondo, rowData.colorFuente);
        } else {
            console.warn("No se pudieron actualizar preview/contrast, ID no encontrado:", rowId);
        }


        // Guarda *toda* la tabla en localStorage después de cualquier cambio
        saveDataToLocalStorage(currentData);
    }

    // Event listener para cambios en inputs
    tableBody.addEventListener('change', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.hasAttribute('data-field')) {
            const rowElement = event.target.closest('tr');
            if (rowElement) {
                // La lógica de triggerRowUpdate se llama desde el listener 'change' del input de texto (incluso si el cambio vino del picker)
                // Si es el input de nombre, también lo llamamos directamente.
                if (event.target.getAttribute('data-field') === 'nombre') {
                    triggerRowUpdate(rowElement);
                }
            }
        }
    });

    // --- INITIAL DATA LOAD ---

    function loadInitialData() {
        const localData = loadDataFromLocalStorage();
        if (localData && localData.length > 0) {
            console.log("Renderizando datos desde localStorage");
            renderTable(localData);
        } else {
            // No hay datos locales, renderizar datos por defecto
            console.log("No hay datos en localStorage, usando datos por defecto.");
            renderTable(defaultData);
            // Guardar los datos por defecto para la próxima vez
            saveDataToLocalStorage(defaultData);
        }
    }

    // --- ROW MANAGEMENT ---

    function addRow() {
        const newId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newRowData = {
            id: newId,
            nombre: 'Nueva Fila',
            colorFondo: '#ededed',
            colorFuente: '#333333'
        };

        const currentData = getDataFromTable();
        currentData.push(newRowData);
        renderTable(currentData); // Re-renderizar
        saveDataToLocalStorage(currentData); // Guardar
        console.log("Nueva fila añadida localmente.");
    }

    // --- IMPORT/EXPORT ---

    function exportData() {
        const data = getDataFromTable();
        if (data.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        try {
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'color_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Datos exportados a color_data.json");
        } catch (error) {
            console.error("Error al exportar datos:", error);
            alert("Ocurrió un error al exportar los datos.");
        }
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData)) throw new Error("El archivo JSON no contiene un array válido.");
                // Validación básica de estructura (opcional pero recomendada)
                const isValid = importedData.every(item =>
                    typeof item === 'object' && item !== null &&
                    'nombre' in item && 'colorFondo' in item && 'colorFuente' in item
                     // Podrías añadir validación de formato HEX aquí si quieres ser más estricto
                );
                if (!isValid) throw new Error("Los datos importados no tienen la estructura esperada (nombre, colorFondo, colorFuente).");

                // Añadir IDs si no existen en el importado (importante para manejo interno)
                importedData.forEach(item => {
                    if (!item.id) {
                        item.id = `client-imported-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    }
                });


                renderTable(importedData); // Renderizar tabla con datos importados
                saveDataToLocalStorage(importedData); // Guardar los nuevos datos
                alert(`Datos importados correctamente desde ${file.name}`);
            } catch (error) {
                console.error('Error al importar datos:', error);
                alert(`Error al importar el archivo: ${error.message}`);
            } finally {
                importFile.value = ''; // Resetear input
            }
        };
        reader.onerror = (e) => {
            console.error('Error al leer el archivo:', e);
            alert('Error al leer el archivo.');
            importFile.value = '';
        };
        reader.readAsText(file);
    }

    // --- EVENT LISTENERS ---
    addRowBtn.addEventListener('click', addRow);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);

    // --- INITIAL LOAD ---
    loadInitialData(); // Carga inicial desde localStorage o datos por defecto

});