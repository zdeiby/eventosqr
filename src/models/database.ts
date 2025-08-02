import React, { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';

// Función para obtener la base de datos desde IndexedDB
async function getFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myDatabase', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sqliteStore')) {
        db.createObjectStore('sqliteStore');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // Verificar si la tienda de objetos (tabla) existe
      if (!db.objectStoreNames.contains('sqliteStore')) {
        console.log('Object store "sqliteStore" does not exist');
        resolve(null);
        return;
      }

      const transaction = db.transaction(['sqliteStore'], 'readonly');
      const store = transaction.objectStore('sqliteStore');
      const getRequest = store.get('sqliteDb');

      getRequest.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          console.log('Data retrieved from IndexedDB:', data);
          resolve(data);
        } else {
          console.log('No data found in IndexedDB');
          resolve(null);
        }
      };

      getRequest.onerror = (event) => {
        console.error('Error retrieving data from IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Función para guardar la base de datos en IndexedDB
const saveDatabase = (db) => {
  if (db) {
    const data = db.export(); // Exportar los datos de la base de datos a un ArrayBuffer
    const request = indexedDB.open('myDatabase', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sqliteStore')) {
        db.createObjectStore('sqliteStore');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['sqliteStore'], 'readwrite');
      const store = transaction.objectStore('sqliteStore');
      const putRequest = store.put(data, 'sqliteDb'); // Guardar los datos en IndexedDB

      putRequest.onsuccess = () => {
        console.log('Data saved to IndexedDB');
      };

      putRequest.onerror = (event) => {
        console.error('Error saving data to IndexedDB:', event.target.error);
      };
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
    };
  }
};

// Función para cargar la base de datos
const loadSQL = async (setDb, fetchUsers) => {
  try {
    const config = {
      locateFile: (file) => `/assets/${file}`,
    };
    const SQL = await initSqlJs(config);

    let database;

    // Intentamos obtener la base de datos desde IndexedDB
    const savedDb = await getFromIndexedDB();
    if (savedDb) {
      const uint8Array = new Uint8Array(savedDb);
      database = new SQL.Database(uint8Array);
    } else {
      // Si no se encuentra, creamos una nueva base de datos
      database = new SQL.Database();

       database.run(`
        CREATE TABLE IF NOT EXISTS t1_comision (
          id_usuario INTEGER PRIMARY KEY,
          cedula TEXT NOT NULL,
          contrasena TEXT NOT NULL,
          estado TEXT NOT NULL
        );
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS t1_eventos (
          id_evento INTEGER PRIMARY KEY,
          estado_evento TEXT,
          nombre_evento TEXT,
          descripcion TEXT,
          lugar_evento TEXT,
          fecha_inicio_evento TEXT,
          hora_inicio_evento TEXT,
          fecha_fin_evento TEXT,
          hora_fin_evento TEXT,
          cupos_totales INTEGER
        );
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS t1_actividades (
          id INTEGER,
          id_evento INTEGER,
          nombre_curso TEXT,
          lugar TEXT,
          descripcion TEXT,
          fecha_inicio TEXT,
          fecha_fin TEXT,
          hora_inicio TEXT,
          hora_fin TEXT,
          cupos TEXT,
          PRIMARY KEY (id_evento, id)
        );
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS t1_accesos_eventos (
          id_evento INTEGER NOT NULL,
          id_curso INTEGER NOT NULL,
          id_usuario INTEGER NOT NULL,
          usuario TEXT NOT NULL,
          tabla TEXT DEFAULT NULL,
          fecharegistro TEXT DEFAULT CURRENT_TIMESTAMP,
          estado INTEGER DEFAULT 1,
          PRIMARY KEY (id_evento, id_curso, id_usuario)
        );
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS t1_asistentes_evento (
          id_evento INTEGER NOT NULL,
          id_usuario INTEGER NOT NULL,
          id_actividad INTEGER NOT NULL,
          ingreso TEXT,
          fecharegistro TEXT NOT NULL,
          usuario INTEGER,
          token TEXT,
          estado INTEGER,
          tabla TEXT,
          PRIMARY KEY (id_evento, id_usuario, id_actividad, fecharegistro)
        );
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS juventud_eventos_estado_evento (
          id_evento INT NOT NULL,
          id_usuario INT NOT NULL,
          estado_caracterizacion INT NOT NULL,
          fecharegistro DATETIME DEFAULT NULL,
          usuario VARCHAR(45) DEFAULT NULL,
          estado INT DEFAULT NULL,
          tabla VARCHAR(100) DEFAULT NULL,
          PRIMARY KEY (id_usuario, id_evento)
        );
      `);


        database.run(`
          CREATE TABLE IF NOT EXISTS inclusion_ciudadano (
            id_usuario INT NOT NULL,
            yearpostulacion INT NOT NULL,
            nacionalidad INT DEFAULT NULL,
            tipodedocumento INT DEFAULT NULL,
            numerodedocumento TEXT,
            nombre1 TEXT,
            nombre2 TEXT,
            apellido1 TEXT,
            apellido2 TEXT,
            fechadenacimiento DATE DEFAULT NULL,
            sexo INT DEFAULT NULL,
            orientacionsexual INT DEFAULT NULL,
            identidaddegenero INT DEFAULT NULL,
            etnia INT DEFAULT NULL,
            estadocivil INT DEFAULT NULL,
            gestantelactante VARCHAR(45) DEFAULT NULL,
            escolaridad INT DEFAULT NULL,
            parentesco INT DEFAULT NULL,
            discapacidad INT DEFAULT NULL,
            regimendesalud INT DEFAULT NULL,
            enfermedades VARCHAR(40) DEFAULT NULL,
            actividad VARCHAR(40) DEFAULT NULL,
            ocupacion VARCHAR(40) DEFAULT NULL,
            campesino INT DEFAULT NULL,
            victima INT DEFAULT NULL,
            sisbenizado INT DEFAULT NULL,
            fecharegistro DATETIME DEFAULT NULL,
            usuario VARCHAR(45) DEFAULT NULL,
            estado INT DEFAULT NULL,
            tabla VARCHAR(100) DEFAULT NULL,
            auditiva VARCHAR(45) DEFAULT NULL,
            mental VARCHAR(45) DEFAULT NULL,
            fisica VARCHAR(45) DEFAULT NULL,
            sordoceguera VARCHAR(45) DEFAULT NULL,
            visual VARCHAR(45) DEFAULT NULL,
            intelectual VARCHAR(45) DEFAULT NULL,
            habitanzacalle VARCHAR(45) DEFAULT NULL,
            correoelectronico TEXT,
            telcontactouno VARCHAR(45) DEFAULT NULL,
            telcontactodos VARCHAR(45) DEFAULT NULL,
            fechadenacimiento_verificada INT DEFAULT NULL,
            formulario VARCHAR(45) DEFAULT NULL,
            numerodedocumento_unico VARCHAR(255),
            es_cuidadora VARCHAR(45) DEFAULT NULL,
            usuario_creacion VARCHAR(255) DEFAULT NULL,
            fecha_creacion VARCHAR(255) DEFAULT NULL,
            PRIMARY KEY (id_usuario, yearpostulacion)
          );
        `);

    }

    setDb(database); // Guardamos la base de datos en el estado
    fetchUsers(database); // Obtener los usuarios o datos
  } catch (err) {
    console.error('Error loading SQL.js:', err);
  }
};

export default loadSQL;
