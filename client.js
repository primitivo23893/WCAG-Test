// client.js (Versión Completa con Botón 'X' superpuesto)
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
            "id": "1746135061559", // Mantener IDs consistentes si es posible
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
            // Asegurarse de que los datos son un array antes de guardar
             if (!Array.isArray(data)) {
                console.error("Intento de guardar datos no válidos en localStorage (no es un array):", data);
                // Opcional: intentar recuperar desde la tabla si 'data' es inválido
                // data = getDataFromTable(); 
                return; // No guardar si los datos son inválidos
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            console.log(`Datos guardados en localStorage (${data.length} filas).`);
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    function loadDataFromLocalStorage() {
        try {
            const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                // Validar que sea un array antes de devolver
                if (Array.isArray(parsedData)) {
                     console.log(`Datos cargados desde localStorage (${parsedData.length} filas).`);
                     return parsedData;
                 } else {
                     console.warn("Datos recuperados de localStorage no son un array válido. Ignorando.");
                     localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar datos inválidos
                     return null;
                 }
            }
        } catch (error) {
            console.error('Error al cargar desde localStorage:', error);
             localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar en caso de error de parseo
        }
        console.log('No se encontraron datos válidos en localStorage.');
        return null; // Devuelve null si no hay datos o hay error
    }

    // Obtiene los datos directamente de la estructura de la tabla HTML actual
    function getDataFromTable() {
        const data = [];
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(rowElement => {
            const id = rowElement.getAttribute('data-id');
             // Asegurarse de que la fila aún exista y tenga ID
            if (!id) {
                 console.warn("Saltando fila sin data-id al obtener datos:", rowElement);
                 return; 
             }

            const nombreInput = rowElement.querySelector('input[data-field="nombre"]');
            const colorFondoInput = rowElement.querySelector('input[data-field="colorFondo"]');
            const colorFuenteInput = rowElement.querySelector('input[data-field="colorFuente"]');

            // Verificar que todos los inputs necesarios existen en esta fila
            if (nombreInput && colorFondoInput && colorFuenteInput) {
                data.push({
                    id: id,
                    nombre: nombreInput.value,
                    colorFondo: colorFondoInput.value, // El valor ya debería estar formateado
                    colorFuente: colorFuenteInput.value // El valor ya debería estar formateado
                });
            } else {
                console.warn('Saltando fila por elementos input faltantes:', rowElement);
            }
        });
        return data;
    }


    // --- CONTRASTE WCAG ---

    function parseHexColor(hex) {
        if (!hex || typeof hex !== 'string') return null;
        // Permitir formato corto (#rgb) y largo (#rrggbb), ignorar otros caracteres
        const match = hex.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
        if (!match) return null;
        let cleanHex = match[1];
        let r, g, b;

        if (cleanHex.length === 3) {
            [r, g, b] = cleanHex.split('').map(c => parseInt(c + c, 16));
        } else { // length === 6
            r = parseInt(cleanHex.substring(0, 2), 16);
            g = parseInt(cleanHex.substring(2, 4), 16);
            b = parseInt(cleanHex.substring(4, 6), 16);
        }
         // Debería ser siempre válido si la regex funcionó, pero comprobamos por si acaso
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null; 
        return { r: r / 255, g: g / 255, b: b / 255 };
    }

    function getRelativeLuminance(rgb) {
        if (!rgb) return -1; // Devuelve -1 si el color no es válido
        // Función de transformación sRGB
        const transform = (c) => (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
        return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
    }

    function getWCAGContrastRatio(hexColor1, hexColor2) {
        const rgb1 = parseHexColor(hexColor1);
        const rgb2 = parseHexColor(hexColor2);
        // Si alguno de los colores no es válido, el contraste no se puede calcular
        if (!rgb1 || !rgb2) return -1; 

        const lum1 = getRelativeLuminance(rgb1);
        const lum2 = getRelativeLuminance(rgb2);
        
        // Asegurarse de que L1 es la luminancia mayor y L2 la menor
        const L1 = Math.max(lum1, lum2);
        const L2 = Math.min(lum1, lum2);
        
        // Fórmula de contraste WCAG
        return (L1 + 0.05) / (L2 + 0.05);
    }

    function updateContrastCell(contrastCell, bgColorHex, fgColorHex) {
        const ratio = getWCAGContrastRatio(bgColorHex, fgColorHex);
        let contentHTML = '';
        // Limpiar clases de estado previas
        contrastCell.classList.remove('wcag-error', 'wcag-pass', 'wcag-fail'); 

        if (ratio === -1) { // Error si el ratio no se pudo calcular (colores inválidos)
            contentHTML = `<span>WCAG AA: <span class="wcag-error">Error</span></span><br><span>WCAG AAA: <span class="wcag-error">Error</span></span>`;
            contrastCell.classList.add('wcag-error');
        } else {
            const aaPass = ratio >= 4.5; // Nivel AA para texto normal
            const aaaPass = ratio >= 7.0; // Nivel AAA para texto normal
            const ratioFormatted = ratio.toFixed(2) + ':1'; // Formatear ratio
            
            // Construir el HTML con clases para colorear Pass/Fail
            contentHTML = `
                <span>WCAG AA: <span class="${aaPass ? 'wcag-pass' : 'wcag-fail'}">${aaPass ? 'Pass' : 'Fail'}</span></span><br>
                <span>WCAG AAA: <span class="${aaaPass ? 'wcag-pass' : 'wcag-fail'}">${aaaPass ? 'Pass' : 'Fail'}</span></span><br>
                <span style="font-size: 0.8em; color: #555;">(${ratioFormatted})</span>
            `;
             // Añadir clase general pass/fail a la celda si se desea (opcional)
             // contrastCell.classList.add(aaPass ? 'wcag-pass' : 'wcag-fail'); 
        }
        contrastCell.innerHTML = contentHTML;
    }

    // --- UI RENDERING & UPDATES ---

    function updatePreviewStyle(previewCell, bgColor, fontColor) {
        // Usar parseHexColor para validar antes de aplicar
        const validBgColor = parseHexColor(bgColor) ? bgColor : '#FFFFFF'; // Blanco si inválido
        const validFontColor = parseHexColor(fontColor) ? fontColor : '#000000'; // Negro si inválido
        previewCell.style.backgroundColor = validBgColor;
        previewCell.style.color = validFontColor;
    }

    // Formatea un input de texto para que contenga un valor HEX válido (#rrggbb o #rgb)
     function formatHexInput(inputElement) {
         let value = inputElement.value.trim().toUpperCase();
         if (!value.startsWith('#')) {
             value = '#' + value;
         }
         // Eliminar caracteres inválidos (permitir solo # y A-F, 0-9)
         value = '#' + value.substring(1).replace(/[^A-F0-9]/g, ''); 

         // Limitar longitud (máximo # + 6 caracteres)
         if (value.length > 7) {
             value = value.substring(0, 7);
         }

         // Opcional: Autocompletar a 6 dígitos si tiene 3? (Ej: #123 -> #112233) - Podría ser confuso
         // if (value.match(/^#[0-9A-F]{3}$/)) {
         //     value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
         // }

         inputElement.value = value;
         return value; // Devuelve el valor formateado
     }
    
    // Helper para crear la celda con input de texto y color picker
    const createColorInputGroup = (fieldName, initialValue, label) => {
        const td = document.createElement('td');
         // Añadir data-label para responsividad CSS
        if (label) td.setAttribute('data-label', label); 

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = initialValue; // Valor inicial
        textInput.setAttribute('data-field', fieldName);
        formatHexInput(textInput); // Aplicar formato inicial

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
         // Sincronizar picker con valor formateado válido, o negro por defecto
        colorPicker.value = parseHexColor(textInput.value) ? textInput.value : '#000000'; 
        colorPicker.style.marginLeft = '5px';
        colorPicker.setAttribute('aria-label', `Selector de color para ${fieldName}`);

        // Evento: Picker cambia -> Actualiza Texto y dispara 'change' en Texto
        colorPicker.addEventListener('input', (e) => {
            textInput.value = e.target.value.toUpperCase(); // Asegurar mayúsculas
             // Disparar evento 'change' en el input de texto para que se procese la actualización
            textInput.dispatchEvent(new Event('change', { bubbles: true })); 
        });

        // Evento: Texto cambia -> Formatea Texto, Actualiza Picker (si válido), Dispara Actualización Fila
        textInput.addEventListener('change', (e) => {
            const formattedValue = formatHexInput(e.target); // Formatear al cambiar
             // Sincronizar el picker solo si el valor formateado es un color válido
            if (parseHexColor(formattedValue)) { 
                 colorPicker.value = formattedValue;
             }
            const rowElement = e.target.closest('tr');
            if(rowElement) {
                triggerRowUpdate(rowElement); // Actualizar preview, contraste y guardar
            }
        });
        
         // Evento: Texto pierde foco -> Asegura formato final
         textInput.addEventListener('blur', (e) => {
             formatHexInput(e.target);
             // Podría volver a disparar triggerRowUpdate si el valor cambió en blur,
             // pero 'change' ya debería haberlo hecho si hubo cambio real.
         });

        td.appendChild(textInput);
        td.appendChild(colorPicker);
        return td;
    };


    function renderTable(data) {
        tableBody.innerHTML = ''; // Limpiar tabla existente
        if (!data || data.length === 0) {
             console.log("No hay datos para renderizar o array vacío.");
             // Opcional: Mostrar mensaje en la tabla
             // tableBody.innerHTML = '<tr><td colspan="5">No hay filas. Añade una o importa datos.</td></tr>';
            return;
        }

        data.forEach((row) => {
            const tr = document.createElement('tr');
            // Asegurarse de que cada fila tenga un ID único
            const rowId = row.id || `client-fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            tr.setAttribute('data-id', rowId);
            tr.style.position = 'relative'; // Necesario para el botón absoluto

            // --- Renderizar Celdas ---
            // Nombre
            const tdNombre = document.createElement('td');
            const inputNombre = document.createElement('input');
            inputNombre.type = 'text'; inputNombre.value = row.nombre; inputNombre.setAttribute('data-field', 'nombre');
            tdNombre.appendChild(inputNombre);
            tr.appendChild(tdNombre);

            // Color Fondo y Fuente (usando el helper)
            tr.appendChild(createColorInputGroup('colorFondo', row.colorFondo, 'FONDO (HEX)'));
            tr.appendChild(createColorInputGroup('colorFuente', row.colorFuente, 'FUENTE (HEX)'));

            // Previsualización
            const tdPreview = document.createElement('td');
            tdPreview.textContent = 'Texto Ejemplo'; tdPreview.classList.add('preview-cell');
            updatePreviewStyle(tdPreview, row.colorFondo, row.colorFuente);
            tr.appendChild(tdPreview);

            // Contraste
            const tdContrast = document.createElement('td');
            tdContrast.classList.add('contrast-cell');
            updateContrastCell(tdContrast, row.colorFondo, row.colorFuente);
            tr.appendChild(tdContrast);

            // --- Botón 'X' para eliminar ---
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;'; // Símbolo 'X'
            deleteBtn.classList.add('delete-row-overlay-btn'); // Clase para CSS
            deleteBtn.setAttribute('type', 'button'); // Buena práctica
            deleteBtn.setAttribute('aria-label', `Eliminar fila ${row.nombre}`); // Accesibilidad
            deleteBtn.title = 'Eliminar esta fila'; // Tooltip

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevenir que otros eventos en la fila se disparen
                // Confirmación antes de eliminar
                if (confirm(`¿Seguro que quieres eliminar la fila "${row.nombre}"?`)) {
                    deleteRow(rowId); // Llamar a la función de eliminación
                }
            });
            tr.appendChild(deleteBtn); // Añadir botón directamente a la fila

            tableBody.appendChild(tr); // Añadir la fila completa a la tabla
        });
         assignDataLabels(); // Reasignar data-labels para responsividad después de renderizar
    }

    // Actualiza la previsualización, contraste y guarda todos los datos
    function triggerRowUpdate(rowElement) {
        const rowId = rowElement.getAttribute('data-id');
        // Obtener los datos específicos de la fila desde los inputs actuales
        const nombreInput = rowElement.querySelector('input[data-field="nombre"]');
        const colorFondoInput = rowElement.querySelector('input[data-field="colorFondo"]');
        const colorFuenteInput = rowElement.querySelector('input[data-field="colorFuente"]');
        
        // Solo proceder si todos los elementos existen
        if (rowId && nombreInput && colorFondoInput && colorFuenteInput) {
            const rowData = {
                id: rowId,
                nombre: nombreInput.value,
                colorFondo: colorFondoInput.value,
                colorFuente: colorFuenteInput.value
            };

            // Actualizar UI de la fila (preview y contraste)
            const previewCell = rowElement.querySelector('.preview-cell');
            const contrastCell = rowElement.querySelector('.contrast-cell');
            if (previewCell) updatePreviewStyle(previewCell, rowData.colorFondo, rowData.colorFuente);
            if (contrastCell) updateContrastCell(contrastCell, rowData.colorFondo, rowData.colorFuente);

            // Obtener *todos* los datos actuales de la tabla para guardar
            const allCurrentData = getDataFromTable();
            saveDataToLocalStorage(allCurrentData); // Guardar estado completo
        } else {
            console.warn("No se pudieron encontrar todos los elementos necesarios para actualizar la fila:", rowId);
        }
    }

    // --- INITIAL DATA LOAD ---

    function loadInitialData() {
        const localData = loadDataFromLocalStorage();
        if (localData && localData.length > 0) {
            console.log("Renderizando datos desde localStorage.");
            renderTable(localData);
        } else {
            // No hay datos locales válidos, usar datos por defecto
            console.log("No hay datos en localStorage o son inválidos, usando datos por defecto.");
            renderTable(defaultData);
            // Guardar los datos por defecto para la próxima vez
            saveDataToLocalStorage(defaultData);
        }
    }

    // --- ROW MANAGEMENT ---

    function addRow() {
         // Crear ID único basado en timestamp + aleatorio
        const newId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newRowData = {
            id: newId,
            nombre: 'Nueva Fila',
            colorFondo: '#FFFFFF', // Fondo blanco por defecto
            colorFuente: '#000000' // Texto negro por defecto
        };

        // Añadir la nueva fila a los datos existentes y guardar
        const currentData = getDataFromTable();
        currentData.push(newRowData);
        saveDataToLocalStorage(currentData); // Guardar primero

        renderTable(currentData); // Re-renderizar la tabla completa

        console.log("Nueva fila añadida:", newId);

        // Opcional: Enfocar el input 'nombre' de la nueva fila para edición rápida
        const newRowElement = tableBody.querySelector(`tr[data-id="${newId}"] input[data-field="nombre"]`);
        if (newRowElement) {
            newRowElement.focus();
            newRowElement.select(); // Seleccionar texto
        }
    }

    // Función para eliminar una fila por su ID
    function deleteRow(rowIdToDelete) {
        console.log('Intentando eliminar fila con ID:', rowIdToDelete);
        const rowElement = tableBody.querySelector(`tr[data-id="${rowIdToDelete}"]`);

        if (rowElement) {
            rowElement.remove(); // Eliminar el elemento <tr> del DOM
            console.log('Fila eliminada del DOM.');

            // Obtener los datos restantes de la tabla y guardarlos
            const currentData = getDataFromTable(); // Obtiene datos SIN la fila eliminada
            saveDataToLocalStorage(currentData);
            console.log('Datos actualizados en localStorage después de eliminar.');
        } else {
            // Si no se encontró en el DOM (raro, pero posible), intentar eliminar de los datos guardados
            console.warn('No se encontró el elemento de la fila para eliminar en el DOM:', rowIdToDelete);
             let currentData = loadDataFromLocalStorage() || [];
             const initialLength = currentData.length;
             currentData = currentData.filter(row => row.id !== rowIdToDelete);
             // Guardar solo si realmente se eliminó algo de los datos cargados
             if (currentData.length < initialLength) {
                 saveDataToLocalStorage(currentData);
                 console.log('Fila eliminada directamente de localStorage (no encontrada en DOM).');
             } else {
                 console.log('La fila no se encontró ni en el DOM ni en los datos de localStorage.');
             }
        }
    }

    // --- IMPORT/EXPORT ---

    function exportData() {
        const data = getDataFromTable(); // Obtener datos actuales de la tabla
        if (data.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        try {
            // Convertir a JSON formateado
            const jsonData = JSON.stringify(data, null, 2); 
            // Crear un Blob (objeto binario) con el JSON
            const blob = new Blob([jsonData], { type: 'application/json' }); 
            // Crear una URL temporal para el Blob
            const url = URL.createObjectURL(blob); 
            // Crear un enlace <a> invisible para iniciar la descarga
            const a = document.createElement('a');
            a.href = url;
            a.download = 'datos_contraste_colores.json'; // Nombre del archivo
            document.body.appendChild(a); // Añadir enlace al DOM
            a.click(); // Simular clic para descargar
            document.body.removeChild(a); // Eliminar enlace del DOM
            URL.revokeObjectURL(url); // Liberar la URL temporal
            console.log("Datos exportados a datos_contraste_colores.json");
        } catch (error) {
            console.error("Error al exportar datos:", error);
            alert("Ocurrió un error al exportar los datos.");
        }
    }

    function importData(event) {
        const file = event.target.files[0]; // Obtener el archivo seleccionado
        if (!file) {
            console.log("No se seleccionó ningún archivo.");
            return; 
        }
        
        const reader = new FileReader(); // Crear lector de archivos

        // Callback cuando el archivo se lea correctamente
        reader.onload = (e) => {
            try {
                let importedData = JSON.parse(e.target.result); // Parsear JSON del archivo

                // Validación 1: ¿Es un array?
                if (!Array.isArray(importedData)) {
                     throw new Error("El archivo JSON no contiene un array (lista) de filas.");
                 }

                // Validación 2: ¿Cada elemento tiene la estructura esperada?
                 const isValidStructure = importedData.every(item =>
                     typeof item === 'object' && item !== null &&
                     'nombre' in item && typeof item.nombre === 'string' &&
                     'colorFondo' in item && typeof item.colorFondo === 'string' &&
                     'colorFuente' in item && typeof item.colorFuente === 'string'
                     // Podríamos validar formato HEX aquí, pero lo haremos al mapear
                 );
                 if (!isValidStructure) {
                     throw new Error("Los datos importados no tienen la estructura esperada (cada fila debe tener 'nombre', 'colorFondo', 'colorFuente').");
                 }
                
                 // Procesar datos importados: asegurar IDs únicos y formatear colores
                 importedData = importedData.map((item, index) => {
                     const formattedFondo = formatHexInput({value: item.colorFondo});
                     const formattedFuente = formatHexInput({value: item.colorFuente});
                     
                     // Validar si el formato es correcto después de intentar formatear
                      if (!parseHexColor(formattedFondo) || !parseHexColor(formattedFuente)) {
                          console.warn(`Fila ${index + 1} (${item.nombre}) contiene colores inválidos (${item.colorFondo}, ${item.colorFuente}). Se usarán colores por defecto.`);
                          // Podrías saltar la fila o usar colores por defecto
                          // return null; // Para saltar la fila
                          return { // Para usar colores por defecto
                             ...item,
                             id: item.id || `client-imported-${Date.now()}-${index}`,
                             colorFondo: '#FFFFFF',
                             colorFuente: '#000000'
                          };
                      }
                     
                     return {
                        ...item,
                         // Asignar ID único si no existe o mantener el existente
                        id: item.id || `client-imported-${Date.now()}-${index}`, 
                        colorFondo: formattedFondo, // Usar valor formateado
                        colorFuente: formattedFuente // Usar valor formateado
                    };
                 });//.filter(item => item !== null); // Descomentar si usaste 'return null' para saltar filas inválidas

                // Reemplazar datos actuales con los importados
                renderTable(importedData); // Renderizar tabla con los nuevos datos
                saveDataToLocalStorage(importedData); // Guardar los datos importados
                alert(`Datos importados correctamente desde ${file.name}. Se procesaron ${importedData.length} filas.`);
                console.log("Datos importados y guardados:", importedData);

            } catch (error) {
                console.error('Error al importar datos:', error);
                alert(`Error al importar el archivo: ${error.message}`);
            } finally {
                // Resetear el input de archivo para permitir importar el mismo archivo de nuevo si se modifica
                importFile.value = ''; 
            }
        };

        // Callback en caso de error al leer el archivo
        reader.onerror = (e) => {
            console.error('Error al leer el archivo:', e);
            alert('Ocurrió un error al leer el archivo seleccionado.');
            importFile.value = ''; // Resetear input
        };
        
        // Iniciar la lectura del archivo como texto
        reader.readAsText(file); 
    }
    
    // Asigna los atributos data-label a las celdas para CSS responsivo
    function assignDataLabels() {
        // Obtener los textos de las 5 cabeceras de datos originales
        const headers = Array.from(document.querySelectorAll('#dataTable thead th'))
                             .slice(0, 5) // Tomar solo las primeras 5
                             .map(th => th.textContent.trim());

        if (headers.length !== 5) {
            console.warn("No se encontraron las 5 cabeceras esperadas para asignar data-labels.");
            return;
        }

        const rows = document.querySelectorAll('#dataTable tbody tr');
        rows.forEach(row => {
            // Seleccionar solo las celdas de datos (td), asumiendo que son las primeras 5
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                // Asignar el data-label correspondiente si el índice es válido (0 a 4)
                if (headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    }

    // --- EVENT LISTENERS ---
    addRowBtn.addEventListener('click', addRow);
    exportBtn.addEventListener('click', exportData);
    // Cuando se hace clic en el botón "Importar", simular clic en el input oculto
    importBtn.addEventListener('click', () => importFile.click()); 
    // Cuando se selecciona un archivo en el input oculto, procesarlo
    importFile.addEventListener('change', importData); 

    // Listener para cambios en los inputs DENTRO de la tabla (delegación de eventos)
    tableBody.addEventListener('change', (event) => {
         // Verificar si el cambio ocurrió en un input con data-field (nombre, colorFondo, colorFuente)
        if (event.target.tagName === 'INPUT' && event.target.hasAttribute('data-field')) {
            const rowElement = event.target.closest('tr');
            if (rowElement) {
                // La función triggerRowUpdate ya se llama desde los listeners de los inputs de color.
                // Solo necesitamos llamarla explícitamente si cambia el input de 'nombre'.
                if (event.target.getAttribute('data-field') === 'nombre') {
                     triggerRowUpdate(rowElement);
                }
                 // Opcional: formatear input de nombre al cambiar (ej: quitar espacios extra)
                 // if (event.target.getAttribute('data-field') === 'nombre') {
                 //    event.target.value = event.target.value.trim();
                 //    triggerRowUpdate(rowElement);
                 // }
            }
        }
    });
     // Opcional: Reasignar data-labels al redimensionar ventana (si el CSS depende de ello)
     // window.addEventListener('resize', assignDataLabels);

    // --- INITIAL LOAD ---
    loadInitialData(); // Carga inicial de datos al cargar la página

}); // Fin del DOMContentLoaded