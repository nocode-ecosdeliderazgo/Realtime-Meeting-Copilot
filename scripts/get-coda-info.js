#!/usr/bin/env node

/**
 * Script para obtener información de Coda (Doc ID y Table ID)
 * Ejecutar: node scripts/get-coda-info.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envLines = envFile.split('\n');
  
  envLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const CODA_API_TOKEN = process.env.CODA_API_TOKEN;

if (!CODA_API_TOKEN || CODA_API_TOKEN === 'your-coda-api-token-here') {
  console.error('❌ Error: CODA_API_TOKEN no encontrada en el .env');
  console.log('💡 Obtén tu token en: https://coda.io/account');
  console.log('💡 Agrega: CODA_API_TOKEN=tu-token-aqui al archivo .env');
  process.exit(1);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'coda.io',
      path: `/apis/v1${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CODA_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getCodaInfo() {
  try {
    console.log('🔍 Obteniendo información de Coda...\n');

    // Obtener documentos
    const docsResponse = await makeRequest('/docs');
    
    if (docsResponse.items && docsResponse.items.length > 0) {
      console.log('📄 Documentos disponibles:');
      docsResponse.items.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.name}`);
        console.log(`      ID: ${doc.id}`);
        console.log(`      URL: ${doc.browserLink}\n`);
      });

      // Obtener tablas del primer documento
      const firstDoc = docsResponse.items[0];
      console.log(`🔍 Obteniendo tablas del documento "${firstDoc.name}"...\n`);
      
      const tablesResponse = await makeRequest(`/docs/${firstDoc.id}/tables`);
      
      if (tablesResponse.items && tablesResponse.items.length > 0) {
        console.log('📊 Tablas disponibles:');
        tablesResponse.items.forEach((table, index) => {
          console.log(`   ${index + 1}. ${table.name}`);
          console.log(`      ID: ${table.id}`);
          console.log(`      Filas: ${table.rowCount || 0}`);
          console.log(`      Columnas: ${table.columnCount || 0}\n`);
        });

        console.log('📝 Configuración para tu .env:');
        console.log(`CODA_DOC_ID=${firstDoc.id}`);
        if (tablesResponse.items.length > 0) {
          console.log(`CODA_TABLE_ID=${tablesResponse.items[0].id} # ${tablesResponse.items[0].name}`);
        }
      } else {
        console.log('⚠️  No se encontraron tablas en el documento.');
        console.log('💡 Crea una tabla llamada "Action Items" en tu documento de Coda.');
      }
    } else {
      console.log('⚠️  No se encontraron documentos.');
      console.log('💡 Crea un documento en https://coda.io');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.log('💡 Verifica que tu CODA_API_TOKEN sea correcto');
    }
  }
}

getCodaInfo();