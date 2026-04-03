const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

// Endpoint para obtener la lista de tests disponibles
app.get('/api/tests', (req, res) => {
    const testsDir = path.join(__dirname, 'tests');
    
    fs.readdir(testsDir, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio de tests:', err);
            return res.status(500).json({ error: 'Error al leer los tests' });
        }
        
        // Filtrar solo los archivos .json
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        // Intentar ordenarlos numéricamente si tienen el formato test1, test2, etc.
        jsonFiles.sort((a, b) => {
            const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
            const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
            return numA - numB;
        });

        res.json(jsonFiles);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de Test-TCAE iniciado en http://localhost:${PORT}`);
});
