#!/usr/bin/env node

/**
 * Script para obtener información de Linear (Team IDs y User IDs)
 * Ejecutar: node scripts/get-linear-info.js
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

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error('❌ Error: LINEAR_API_KEY no encontrada en el .env');
  console.log('💡 Asegúrate de haber configurado tu API key en el archivo .env');
  process.exit(1);
}

const query = `
  query {
    viewer {
      id
      name
      email
    }
    teams {
      nodes {
        id
        name
        key
        description
      }
    }
  }
`;

const postData = JSON.stringify({ query });

const options = {
  hostname: 'api.linear.app',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': LINEAR_API_KEY,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔍 Obteniendo información de Linear...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.errors) {
        console.error('❌ Error en la consulta GraphQL:');
        console.error(response.errors);
        return;
      }

      const { viewer, teams } = response.data;

      console.log('👤 Tu información de usuario:');
      console.log(`   ID: ${viewer.id}`);
      console.log(`   Nombre: ${viewer.name}`);
      console.log(`   Email: ${viewer.email}\n`);

      console.log('🏢 Equipos disponibles:');
      teams.nodes.forEach(team => {
        console.log(`   ${team.name} (${team.key})`);
        console.log(`   ID: ${team.id}`);
        console.log(`   Descripción: ${team.description || 'Sin descripción'}\n`);
      });

      console.log('📝 Configuración para tu .env:');
      console.log(`LINEAR_DEFAULT_ASSIGNEE_ID=${viewer.id}`);
      if (teams.nodes.length > 0) {
        console.log(`LINEAR_TEAM_ID=${teams.nodes[0].id} # ${teams.nodes[0].name}`);
      }
      
    } catch (error) {
      console.error('❌ Error parseando respuesta:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
});

req.write(postData);
req.end();