import React, { useEffect, useState, useRef } from 'react';
import { IonContent, IonGrid, IonCol, IonRow, IonHeader,IonInput, IonPage, IonTitle, IonToolbar, IonButton, IonList, useIonViewDidEnter, IonLabel, IonItem, IonAccordion, IonAccordionGroup, IonSearchbar } from '@ionic/react';
import axios from "axios";
import loadSQL from '../models/database';
import './Login.css';
import LogoCAH from '../imagenes/escudoalcaldia.png';

interface Person {
    cedula: string;
    contrasena: string;
  }

const Login = () => {


    //   const handleLogin = () => {
    //     // Aquí puedes manejar el inicio de sesión
    //     console.log(`Username: ${username}`);
    //     console.log(`Password: ${password}`);
    //   };



    
  const [db, setDb] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');



  // hook for sqlite db


  useEffect(() => {
    loadSQL(setDb, fetchUsers);
  }, []);



  const saveDatabase = () => {
    if (db) {
      const data = db.export();
      localStorage.setItem('sqliteDb', JSON.stringify(Array.from(data)));
      const request = indexedDB.open('myDatabase', 1); // Asegúrate de usar el mismo nombre de base de datos
  
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
        const putRequest = store.put(data, 'sqliteDb');
  
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


  const fetchUsers = async (database = db) => {
    if (database) {
      const res = await database.exec('SELECT * FROM t1_comision where estado=1;');
      if (res[0]?.values && res[0]?.columns) {
        const transformedPeople: Person[] = res[0].values.map((row: any[]) => {
          return res[0].columns.reduce((obj, col, index) => {
            obj[col] = row[index];
            return obj;
          }, {} as Person);
        });
        setPeople(transformedPeople);
      }
    }

  };


  const sincronizacion = async () => {
    fetchUsers();
    saveDatabase();
    //console.log(people)
  

    try {
        const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_login');
        const jsonData = response.data;

        console.log('Datos JSON recibidos:', jsonData);
       // setProgramas(jsonData);
       console.log(jsonData)
        for (const item of jsonData) {
          await db.run(`INSERT OR REPLACE INTO t1_comision (id_usuario, cedula, contrasena, estado) VALUES (?, ?, ?, ?);`, [
            item.ID_USUARIO, item.CEDULA, item.CONTRASENA,item.ESTADO
          ]);
        }
  
        saveDatabase();
        fetchUsers();
      } catch (err) {
        console.error('Error al exportar los datos JSON: t1_programas', err);
      }

      try {
        const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos');
        const jsonData = response.data;

        console.log('Datos JSON recibidos:', jsonData);
       // setProgramas(jsonData);
       for (const item of jsonData) {
          await db.run(`INSERT OR REPLACE INTO t1_eventos (
            id_evento, estado_evento, nombre_evento, descripcion, lugar_evento,
            fecha_inicio_evento, hora_inicio_evento, fecha_fin_evento, hora_fin_evento, cupos_totales
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
            item.id_evento,
            item.estado_evento,
            item.nombre_evento,
            item.descripcion,
            item.lugar_evento,
            item.fecha_inicio_evento,
            item.hora_inicio_evento,
            item.fecha_fin_evento,
            item.hora_fin_evento,
            item.cupos_totales
          ]);
        }
  
        saveDatabase();
        fetchUsers();
      } catch (err) {
        console.error('Error al exportar los datos JSON: t1_programas', err);
      }

      try {
        const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_actividades');
        const jsonData = response.data;

        console.log('Datos JSON recibidos:', jsonData);
       // setProgramas(jsonData);
       console.log(jsonData)
         for (const item of jsonData) {
          await db.run(`INSERT OR REPLACE INTO t1_actividades (
            id, id_evento, nombre_curso, lugar, descripcion, fecha_inicio,
            fecha_fin, hora_inicio, hora_fin, cupos
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
            item.id,
            item.id_evento,
            item.nombre_curso,
            item.lugar,
            item.descripcion,
            item.fecha_inicio,
            item.fecha_fin,
            item.hora_inicio,
            item.hora_fin,
            item.cupos
          ]);
        }
  
        saveDatabase();
        fetchUsers();
      } catch (err) {
        console.error('Error al exportar los datos JSON: t1_programas', err);
      }


      try {
        const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_accesos');
        const jsonData = response.data;

        console.log('Datos JSON recibidos (accesos):', jsonData);

        for (const item of jsonData) {
          await db.run(`INSERT OR REPLACE INTO t1_accesos_eventos (
            id_evento, id_curso, id_usuario, usuario, tabla, fecharegistro, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`, [
            item.id_evento,
            item.id_curso,
            item.id_usuario,
            item.usuario,
            item.tabla,
            item.fecharegistro,
            item.estado
          ]);
        }

        saveDatabase();
        fetchUsers();
      } catch (err) {
        console.error('Error al exportar los datos JSON: t1_accesos_eventos', err);
      }



      try {
        const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_asistentes');
        const jsonData = response.data;

        for (const item of jsonData) {
          await db.run(`INSERT OR REPLACE INTO t1_asistentes_evento (
            id_evento, id_usuario, id_actividad, ingreso, fecharegistro,
            usuario, token, estado, tabla
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
            item.id_evento,
            item.id_usuario,
            item.id_actividad,
            item.ingreso,
            item.fecharegistro,
            item.usuario,
            item.token,
            item.estado,
            item.tabla
          ]);
        }

         saveDatabase();
        fetchUsers();
      } catch (err) {
        console.error('Error al descargar asistentes:', err);
}



  }


        const handleLogin = () => {
            const user = people.find(person => person.cedula === username && person.contrasena === password);
            
            if (user) {
            localStorage.setItem('cedula', username);
            window.location.href = '/cobertura'; // Redirige a la página de inicio
            } else {
            alert('Credenciales incorrectas');
            }
        };

    return (

        <IonPage>
            <IonContent>
                <IonHeader>
                    <IonToolbar >
                        <IonTitle >Eventos Juventud</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonGrid>
                    <IonCol style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img height="50%" width="50%" src={LogoCAH} alt="Logo" />
                    </IonCol>
                    <IonRow>
                        <IonCol>
                        {(people[0]?.cedula)?    <IonItem >
                                <IonInput label="Usuario" labelPlacement="floating" fill="outline" placeholder="Ingrese Usuario"
                                    value={username}
                                    onIonInput={(e) => setUsername(e.detail.value)}
                                    type="text"
                                />
                            </IonItem> :''}
                        </IonCol>
                    </IonRow>  
                    <IonRow>
                        <IonCol>
                           {(people[0]?.cedula)? <IonItem>
                                <IonInput type="password" label="Contraseña" labelPlacement="floating" fill="outline" placeholder="Ingrese Contraseña"
                                    value={password}
                                    onIonInput={(e) => setPassword(e.detail.value)}
                                />
                            </IonItem> :''}
                        </IonCol>
                    </IonRow>  <hr></hr>
                    {(people[0]?.cedula)?  <IonButton expand="full" color="secondary" onClick={handleLogin}>Iniciar Sesión</IonButton>:''}
                    {(people[0]?.cedula)?'':  <IonButton expand="full" onClick={sincronizacion}>Sincronización bajada de información</IonButton> }

                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default Login;

