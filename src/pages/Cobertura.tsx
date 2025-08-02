import React, { useEffect, useState, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonList, useIonViewDidEnter, IonLabel, IonItem, IonAccordion, IonAccordionGroup, IonSearchbar, IonModal, IonButtons, IonSelect, IonSelectOption } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import axios from "axios";
import loadSQL from '../models/database';
import './ProgressBar.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { isPlatform } from '@ionic/react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Html5Qrcode } from "html5-qrcode";
import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.css";
import Swal from "sweetalert2";
import Select from 'react-select'; 

interface Evento {
  id_evento: number;
  estado_evento: string | null;
  nombre_evento: string | null;
  descripcion: string | null;
  lugar_evento: string | null;
  fecha_inicio_evento: string | null;
  hora_inicio_evento: string | null;
  fecha_fin_evento: string | null;
  hora_fin_evento: string | null;
  cupos_totales: number | null;
}

interface EventoAsistente {
  id_evento: number;
  id_usuario: number;
  estado_caracterizacion: number;
  fecharegistro: string | null;  // Fecha del registro, puede ser nula
  usuario: string | null;        // Nombre o ID del usuario, puede ser nulo
  estado: number | null;         // Estado del registro, puede ser nulo
  tabla: string | null;          // Nombre de la tabla, puede ser nulo
}


interface Actividad {
  id: number;
  id_evento: number;
  nombre_curso: string | null;
  lugar: string | null;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  cupos: string | null;
}

interface AccesoEvento {
  id_evento: number;
  id_curso: number;
  id_usuario: number;
  usuario: string;
  tabla: string | null;
  fecharegistro: string | null;
  estado: number | null;
}

interface AsistenteEvento {
  id_evento: number;
  id_usuario: number;
  id_actividad: number;
  ingreso: string | null;
  fecharegistro: string;
  usuario: number | null;
  token: string | null;
  estado: number | null;
  tabla: string | null;
}



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

      if (!db.objectStoreNames.contains('sqliteStore')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['sqliteStore'], 'readonly');
      const store = transaction.objectStore('sqliteStore');
      const getRequest = store.get('sqliteDb');

      getRequest.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          resolve(data);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = (event) => {
        reject(event.target.error);
      };
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}


const Cobertura: React.FC = () => {

  const [db, setDb] = useState<any>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [accesosEvento, setAccesosEvento] = useState<AccesoEvento[]>([]);
  const [asistentesEvento, setAsistentesEvento] = useState<AsistenteEvento[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [decodedData, setDecodedData] = useState<any>(null);
  const [scanner, setScanner] = useState<any>(null);
  const [cursosInscritos, setCursosInscritos] = useState<Actividad[]>([]);
  const [totalAsistentesEstado2, setTotalAsistentesEstado2] =useState<EventoAsistente[]>([]);




  const [sincro, setSincro] = useState<any>(false);
  const [porcentaje, setPorcentaje] = useState<any>(1);
  const [showModal, setShowModal] = useState(false);
  const [dbContent, setDbContent] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const fetchDatabaseContent = async () => {
      const savedDb = await getFromIndexedDB();
      if (savedDb) {
        setDbContent(new Uint8Array(savedDb));
      } else {
        console.error('No database found in IndexedDB');
      }
    };

    fetchDatabaseContent();
  }, []);

  const getCurrentDateTime = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  const downloadFile = async () => {
    if (!dbContent) {
      console.error('No database content to download');
      return;
    }

    const fileName = `${localStorage.getItem('cedula')}_${getCurrentDateTime()}.sqlite`;
    const blob = new Blob([dbContent], { type: 'application/octet-stream' });

    if (isPlatform('hybrid')) {
      try {
        const base64Data = await convertBlobToBase64(blob);
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data as string,
          directory: Directory.Documents,
        });

        alert('Archivo descargado exitosamente, busque el archivo en almacenamiento Documents');
      } catch (error) {
        console.error('Error al guardar el archivo:', error);
        alert('Error al guardar el archivo');
      }
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const convertBlobToBase64 = (blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };


  // hook for sqlite db

    //  let scanner: any = null;

useEffect(() => {
  if (showQRModal) {
    const timeout = setTimeout(() => {
      const readerElement = document.getElementById("reader");
      if (!readerElement) {
        console.warn("❌ No se encontró el div#reader");
        return;
      }

      const qrcode = new Html5Qrcode("reader");
      setScanner(qrcode);

      qrcode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 320 },
          async (decodedText) => {
            await qrcode.stop();
            setShowQRModal(false);

            try {
              const urlParams = new URLSearchParams(decodedText.split("?")[1]);
              const id_usuario = urlParams.get("idusuario");
              const id_evento = urlParams.get("idevento");
              const token = urlParams.get("token");

              if (!id_usuario || !id_evento || !token) {
                alert("QR inválido");
                return;
              }

              setDecodedData({ id_usuario, id_evento, token });
              setShowCursoModal(true);
            } catch (error) {
              alert("❌ QR inválido o mal formado");
            }
          },
          () => {}
        )
        .catch((err) => {
          console.error("❌ Error al iniciar escáner:", err);
        });
    }, 500); // espera medio segundo para que el modal renderice

    return () => {
      clearTimeout(timeout);
    };
  }
}, [showQRModal]);



const registrarAsistencia = async () => {
  if (cursosFiltrados.length > 0 && !selectedCurso) {
    alert("Seleccione una actividad.");
    return;
  }

  const hoy = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString().replace("T", " ").split(".")[0]; // para fecharegistro con hora
  const usuarioSistema = localStorage.getItem('cedula') || "sistema";

  const nuevoRegistro = {
    id_evento: parseInt(decodedData.id_evento),
    id_usuario: parseInt(decodedData.id_usuario),
    id_actividad: selectedCurso ? parseInt(selectedCurso) : 0,
    ingreso: "qr",
    fecharegistro: now,
    usuario: usuarioSistema,
    token: decodedData.token,
    estado: 1,
    tabla: "eventos_juventud_asistentes"
  };

  try {
    await  db.run(
      `
      INSERT OR REPLACE INTO t1_asistentes_evento 
      (id_evento, id_usuario, id_actividad, ingreso, fecharegistro, usuario, token, estado, tabla)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        nuevoRegistro.id_evento,
        nuevoRegistro.id_usuario,
        nuevoRegistro.id_actividad,
        nuevoRegistro.ingreso,
        nuevoRegistro.fecharegistro,
        nuevoRegistro.usuario,
        nuevoRegistro.token,
        nuevoRegistro.estado,
        nuevoRegistro.tabla
      ]
    );

    // Refresca datos si lo deseas
    // await fetchAsistencias();

    setShowCursoModal(false);
    setSelectedCurso("");
    saveDatabase();
    alert("✅ Asistencia registrada correctamente");
    fetchAsistentesEvento();
    fetchEventos();
  } catch (error) {
    console.error("❌ Error al registrar asistencia:", error);
    alert("Ocurrió un error al registrar la asistencia.");
  }
};


    const cursosFiltrados = decodedData
      ? actividades.filter((c) => c.id_evento === Number(decodedData.id_evento))
      : [];


  useEffect(() => {
    const syncData = async () => {
      await loadSQL(setDb, fetchEventos);
      await fetchEventos(); 
      await  contarAsistentesEstado2();
      await fetchActividades();
      await fetchAccesosEvento();
      await fetchAsistentesEvento();
 
    };
    syncData();
  }, []);

  useEffect(() => {
    const syncData = async () => {
    await fetchEventos(); 
    await  contarAsistentesEstado2();
    await fetchActividades();
    await fetchAccesosEvento();
    await fetchAsistentesEvento();

 
    };
    syncData();
  }, [db]);



  const saveDatabase = () => {
    if (db) {
      const data = db.export();
      //localStorage.setItem('sqliteDb', JSON.stringify(Array.from(data)));
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
        //  console.log('Data saved to IndexedDB');
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

  const fetchEventos = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_eventos";');
    if (res[0]?.values && res[0]?.columns) {
      const transformedEventos: Evento[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as Evento);
      });
      setEventos(transformedEventos);
    }
  }
};


const contarAsistentesEstado2 = async (database = db) => {
  if (database) {
      const res = await database.exec('SELECT * FROM "juventud_eventos_estado_evento" WHERE estado_caracterizacion = 2');
     if (res[0]?.values && res[0]?.columns) {
      const transformedAsistentes: EventoAsistente[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as EventoAsistente);
      });
      setTotalAsistentesEstado2(transformedAsistentes);
    }
  }
};



const fetchActividades = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_actividades";');
    if (res[0]?.values && res[0]?.columns) {
      const transformedActividades: Actividad[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as Actividad);
      });
      setActividades(transformedActividades);
    }
  }
};

const fetchAccesosEvento = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_accesos_eventos";');
    if (res[0]?.values && res[0]?.columns) {
      const transformedAccesos: AccesoEvento[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as AccesoEvento);
      });
      setAccesosEvento(transformedAccesos);
    }
  }
};


const fetchAsistentesEvento = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_asistentes_evento";');
    if (res[0]?.values && res[0]?.columns) {
      const transformed: AsistenteEvento[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as AsistenteEvento);
      });
      setAsistentesEvento(transformed);
    }
  }
};


  const sincronizacion = async () => {
  setSincro(true);
  setPorcentaje(2);
  closeModal();

  await saveDatabase();
  await fetchEventos(); 
  await fetchActividades();
  await  contarAsistentesEstado2();
  await fetchAccesosEvento();
  await fetchAsistentesEvento();

  
  // 🟩 GUARDAR ASISTENTES
  const guardarAsistentes = async () => {
    const response = await axios.post(
      'https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_guardar_asistentes_evento',
      asistentesEvento,
      { headers: { 'Content-Type': 'application/json' } }
    );
    setPorcentaje(10);
   // console.log('Asistentes enviados:', response.data);
  };

  if (!(await retryConDecision(guardarAsistentes, 'Error al guardar los asistentes'))) return setSincro(false);

  // 🟩 DESCARGAR USUARIOS
  const descargarUsuarios = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_login');
    for (const item of response.data) {
      await db.run(`INSERT OR REPLACE INTO t1_comision (id_usuario, cedula, contrasena, estado) VALUES (?, ?, ?, ?);`, [
        item.ID_USUARIO, item.CEDULA, item.CONTRASENA, item.ESTADO
      ]);
    }
    saveDatabase();
    fetchEventos();
    setPorcentaje(20);
  };

  if (!(await retryConDecision(descargarUsuarios, 'Error al descargar usuarios'))) return setSincro(false);

  // 🟩 DESCARGAR EVENTOS
  const descargarEventos = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos');
    for (const item of response.data) {
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
    fetchEventos();
    setPorcentaje(30);
  };

  if (!(await retryConDecision(descargarEventos, 'Error al descargar eventos'))) return setSincro(false);

  // 🟩 DESCARGAR ASISTENTES
  const descargarAsistentes = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_asistentes');
    for (const item of response.data) {
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
    fetchEventos();
    setPorcentaje(40);
  };

  if (!(await retryConDecision(descargarAsistentes, 'Error al descargar asistentes'))) return setSincro(false);

      // 🟩 DESCARGAR JUVENTUD EVENTOS ESTADO EVENTO
    const descargarJuventudEventosEstadoEvento = async () => {
      const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_general_asistentes');
      for (const item of response.data) {
        await db.run(`
          INSERT OR REPLACE INTO juventud_eventos_estado_evento (
            id_evento, id_usuario, estado_caracterizacion, fecharegistro,
            usuario, estado, tabla
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`, [
          item.id_evento,
          item.id_usuario,
          item.estado_caracterizacion,
          item.fecharegistro,
          item.usuario,
          item.estado,
          item.tabla
        ]);
      }
      saveDatabase();
      fetchEventos(); // Puedes modificar esto según necesites, si deseas recargar datos o ejecutar alguna acción
      setPorcentaje(60);
    };

      if (!(await retryConDecision(descargarJuventudEventosEstadoEvento, 'Error al descargar asistentes'))) return setSincro(false);


      // 🟩 DESCARGAR INCLUSION CIUDADANO
      const descargarInclusionCiudadano = async () => {
        try {
          const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_inclusion_ciudadano');
          const jsonData = response.data;

          // Dividir los datos en bloques de 100
          const chunkSize = 100;
          for (let i = 0; i < jsonData.length; i += chunkSize) {
            const chunk = jsonData.slice(i, i + chunkSize);

            for (const item of chunk) {
              await db.run(`
                INSERT OR REPLACE INTO inclusion_ciudadano (
                  id_usuario, yearpostulacion, nacionalidad, tipodedocumento, numerodedocumento, nombre1, nombre2,
                  apellido1, apellido2, fechadenacimiento, sexo, orientacionsexual, identidaddegenero, etnia,
                  estadocivil, gestantelactante, escolaridad, parentesco, discapacidad, regimendesalud, enfermedades,
                  actividad, ocupacion, campesino, victima, sisbenizado, fecharegistro, usuario, estado, tabla,
                  auditiva, mental, fisica, sordoceguera, visual, intelectual, habitanzacalle, correoelectronico,
                  telcontactouno, telcontactodos, fechadenacimiento_verificada, formulario, numerodedocumento_unico,
                  es_cuidadora, usuario_creacion, fecha_creacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
              `, [
                item.id_usuario, item.yearpostulacion, item.nacionalidad, item.tipodedocumento, item.numerodedocumento,
                item.nombre1, item.nombre2, item.apellido1, item.apellido2, item.fechadenacimiento, item.sexo,
                item.orientacionsexual, item.identidaddegenero, item.etnia, item.estadocivil, item.gestantelactante,
                item.escolaridad, item.parentesco, item.discapacidad, item.regimendesalud, item.enfermedades,
                item.actividad, item.ocupacion, item.campesino, item.victima, item.sisbenizado, item.fecharegistro,
                item.usuario, item.estado, item.tabla, item.auditiva, item.mental, item.fisica, item.sordoceguera,
                item.visual, item.intelectual, item.habitanzacalle, item.correoelectronico, item.telcontactouno,
                item.telcontactodos, item.fechadenacimiento_verificada, item.formulario, item.numerodedocumento_unico,
                item.es_cuidadora, item.usuario_creacion, item.fecha_creacion
              ]);
            }

            // Actualiza el progreso según el número de bloques procesados
            setPorcentaje((i + chunkSize) / jsonData.length * 100);
          }

          saveDatabase();
          fetchEventos(); // Similarmente, puedes cargar los datos si es necesario
          setPorcentaje(100); // Se asegura que el porcentaje llega al 100% al finalizar
        } catch (err) {
          console.error('Error al descargar los datos de inclusion_ciudadano:', err);
        }
      };


      if (!(await retryConDecision(descargarInclusionCiudadano, 'Error al descargar asistentes'))) return setSincro(false);


  // 🟩 DESCARGAR ACTIVIDADES
  const descargarActividades = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_actividades');
    for (const item of response.data) {
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
    fetchEventos();
    setPorcentaje(100);
    await openModal('Sincronización efectiva', 'success', 'light', 'none');
  };

  if (!(await retryConDecision(descargarActividades, 'Error al descargar actividades'))) return setSincro(false);

  setSincro(false);
};




  const history = useHistory();
  const cedula = localStorage.getItem('cedula'); // Obtener 'cedula' de localStorage

  useEffect(() => {
    // Comprobar si 'cedula' existe, si no, redirigir a 'login'
    if (!cedula) {
      history.push('/login');
    }
  }, [cedula, history]); // Dependencias del efecto



  const accordionGroup = useRef<null | HTMLIonAccordionGroupElement>(null);
  const toggleAccordion = () => {
    if (!accordionGroup.current) {
      return;
    }
    const nativeEl = accordionGroup.current;

    if (nativeEl.value === 'second') {
      nativeEl.value = undefined;
    } else {
      nativeEl.value = 'second';
    }
  };

  const handleEditClick = (idfiu: string) => {
    window.location.href = `/tabs/tab3/${idfiu}`;
  };

  const [searchText, setSearchText] = useState('');


const filteredEventos = eventos.filter((evento) => {
  const texto = searchText.toLowerCase();
  return (
    (evento.nombre_evento || '').toLowerCase().includes(texto) ||
    (evento.descripcion || '').toLowerCase().includes(texto) ||
    (evento.lugar_evento || '').toLowerCase().includes(texto)
  );
});


  const [modalResolve, setModalResolve] = useState<((value: boolean) => void) | null>(null);
  const [texto, setTextoModal] = useState<null | (() => void)>(null);
  const [color, setColorModal] = useState<null | (() => void)>(null);
  const [mensaje, setMensaje] = useState<null | (() => void)>(null);
  const [displaymodal, setDisplaymodal] = useState<null | (() => void)>(null);

const openModal = (mensaje, color, texto, displaymodal = '') => {
  setTextoModal(texto);
  setColorModal(color);
  setMensaje(mensaje);
  setDisplaymodal(displaymodal);

  return new Promise<boolean>((resolve) => {
    setModalResolve(() => resolve); // 🔁 Esto guarda la función resolve
    setShowModal(true);
  });
};




  const retryConDecision = async (fn: () => Promise<void>, mensajeError: string) => {
  let intentos = 0;
  while (intentos < 3) {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error(`Error en intento ${intentos + 1}`, error);
      const decision = await mostrarModalReintento(`${mensajeError}. ¿Deseas reintentar o cancelar?`);
      if (!decision) return false; // Cancelar
    }
    intentos++;
  }
  return false;
};



const mostrarModalReintento = async (mensaje: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTextoModal(() => () => <>{mensaje}</>);
    setColorModal('danger');
    setMensaje(mensaje);
    setDisplaymodal('block');

    // Guarda la función `resolve` en el estado para usarla desde los botones
    setModalResolve(() => resolve); // 👈 CORRECTO: se pasa directamente `resolve`

    setShowModal(true);
  });
};



 const uniqueAsistentes = asistentesEvento.filter((value, index, self) => 
    index === self.findIndex((t) => (
      t.id_usuario === value.id_usuario && 
      t.id_evento === value.id_evento && 
      t.id_actividad === value.id_actividad
    ))
  );

const closeModal = () => {
  setShowModal(false);
  if (modalResolve) {
    modalResolve(); // Esto cierra el modal y continúa la ejecución
  }
};


const contarAsistentesEstado2PorEvento = (eventoId: number, totalAsistentesEstado2variable: any[]) => {

   console.log(totalAsistentesEstado2, 'asistentes');
  // Filtra los asistentes que pertenecen a ese evento y tienen el estado 2
  const asistentesEstado2 = totalAsistentesEstado2.filter(
    (asistente) => asistente.id_evento === eventoId && asistente.estado_caracterizacion === 2
  );

  console.log(totalAsistentesEstado2, 'asistentes');
  return asistentesEstado2.length;  // Devuelve el total de asistentes con estado 2 para ese evento
};


 
  return (

    <IonPage >
      {(sincro) ? <>
        <div className="container">
          <div className="progress-container">
            <label htmlFor="">Sincronizando</label>
            <div className="progress" role="progressbar" aria-label="Animated striped example" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>
        </div>
        <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'} `} id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div className="modal-dialog ">
          <div className={`modal-content bg-${color} text-light`}>
          
              <h1 className="modal-title fs-5" id="staticBackdropLabel"></h1>
            
            <div className="modal-body">
              {mensaje}
            </div>

              <div className="d-flex pt-2 pb-2 p-2 text-right justify-content-end">
                {displaymodal !== 'none' ? (
                  <>
                    <button
                type="button"
                className={`btn btn-${color}`}
                style={{ display: `${displaymodal}` }}
                onClick={() => {
                  setShowModal(false);
                  if (modalResolve) {
                    modalResolve(false); // ⛔ CANCELAR = FALSE
                    setModalResolve(null); // limpia
                  }
                }}
              >
                Cancelar
              </button>&nbsp;

              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setShowModal(false);
                  modalResolve?.(true); // 👉 Reintentar
                }}
              >
                Reintentar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                setShowModal(false);
                modalResolve?.(); // 👉 Aceptar
              }}
            >
              Aceptar
            </button>
          )}
        </div>

            
          </div>
        </div>
      </div>
  
        </>


        : <>
          {cedula ? (

            <>
              <IonHeader >
                <IonToolbar>
                  <IonTitle slot="start">Eventos</IonTitle>
                  {/* <IonButton color="danger" slot="end" onClick={() => {
                    //localStorage.removeItem('cedula');
                    window.location.href = `/tabs/tab3/${Math.random().toString().substr(2, 5)}${cedula}`;
                  }}>Crear Ficha</IonButton> */}
                  <IonButton slot="end"  style={{
                      '--background': '#0e7fe1',
                      '--color': 'white' // color del texto
                    }}  onClick={() => setShowQRModal(true)}>
                    Escanear QR
                  </IonButton>
                   <IonButton slot="end" color="light" onClick={downloadFile}>Descargar bd</IonButton> 
                  <IonButton slot="end" color='light' onClick={() => {
                    localStorage.removeItem('cedula');
                    history.push('/login'); // Redirigir a login después de borrar 'cedula'
                  }}>Cerrar Sesión</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent fullscreen>

                <IonList>
                      <IonItem lines="none">
                        <div
                          className="ion-align-items-center"
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <IonLabel style={{ width: '70%' }}>Eventos</IonLabel>
                          <IonLabel style={{ width: '27%' }}>Registrados</IonLabel>
                          
                          
                        </div>
                      </IonItem>
                    </IonList>

                   <IonList>
  {filteredEventos.map((evento, idx) => (
    <IonAccordionGroup key={idx}>
      <IonAccordion value={`evento-${evento.id_evento}`}>
        <IonItem slot="header" color="light">
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IonLabel style={{ width: '70%' }}>{evento.nombre_evento}</IonLabel>
            <IonLabel style={{ width: '20%' }}>
              {contarAsistentesEstado2PorEvento(evento.id_evento, asistentesEvento)}
            </IonLabel>
          </div>
        </IonItem>

        <div className="ion-padding" slot="content">
          <IonList>
            {/* Verificar si no hay actividades */}
            {actividades.filter((act) => act.id_evento === evento.id_evento).length === 0 ? (
              // Si no hay actividades, mostrar los inscritos con id_actividad igual a 0
              <>
                <IonItem>
                  <IonLabel>Sin Actividades</IonLabel>
                </IonItem>

                {/* Mostrar los inscritos con id_actividad igual a 0 */}
                {asistentesEvento
                  .filter((asistente) => asistente.id_evento === evento.id_evento && asistente.id_actividad === 0)
                  .map((asistente, idx) => (
                    <IonItem key={idx}>
                      <IonLabel>
                        <h2>Inscrito: {asistente.usuario}</h2>
                        <p>Fecha de Registro: {asistente.fecharegistro}</p>
                      </IonLabel>
                    </IonItem>
                  ))}
              </>
            ) : (
              // Si hay actividades, mostrar las actividades y sus inscritos
              actividades
                .filter((act) => act.id_evento === evento.id_evento)
                .map((actividad, i) => (
                  <IonItem key={i}>
                    <IonLabel>
                      <h2>📚 {actividad.nombre_curso}</h2>
                      <p>📍 {actividad.lugar} — {actividad.fecha_inicio} {actividad.hora_inicio}</p>
                      <p>👥 Inscritos: {
                        accesosEvento.filter(
                          (a) => a.id_evento === evento.id_evento && a.id_curso === actividad.id
                        ).length
                      }</p>
                      <p>✅ Asistentes: {
                        uniqueAsistentes.filter(
                          (a) => a.id_evento === evento.id_evento && a.id_actividad === actividad.id
                        ).length
                      }</p>
                    </IonLabel>
                  </IonItem>
                ))
            )}
          </IonList>
        </div>
      </IonAccordion>
    </IonAccordionGroup>
  ))}
</IonList>



               



              </IonContent>
              <IonSearchbar
                value={searchText}
                onIonInput={(e) => setSearchText(e.detail.value)}
                placeholder="Buscar por estado, ficha, nombre, etc."
              />
              <IonButton onClick={sincronizacion}  
               style={{
                  '--background': '#0e7fe1',
                  '--color': 'white' // color del texto
                }}>Sincronización subida de información</IonButton>


                  {/* Modal de escaneo QR */}
                  <IonModal isOpen={showQRModal} 
                     onDidDismiss={() => setShowQRModal(false)}
                  >
                  <IonHeader>
                    <IonToolbar>
                      <IonTitle>Escanear QR</IonTitle>
                      <IonButtons slot="end">
                        <IonButton onClick={async () => {
                      if (scanner) {
                        await scanner.stop();
                        setShowQRModal(false);
                      }
                    }}>Cancelar</IonButton>
                      </IonButtons>
                    </IonToolbar>
                  </IonHeader>
                  <IonContent>
                    <div id="reader" style={{ width: "100%", height: 430, marginTop: 20 }}></div>
                  </IonContent>
                </IonModal>

                    {/* Modal de selección de curso */}
                <IonModal isOpen={showCursoModal} onDidDismiss={() => setShowCursoModal(false)}>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle>Registrar Asistencia</IonTitle>
                    <IonButtons slot="end">
                      <IonButton onClick={() => setShowCursoModal(false)}>Cancelar</IonButton>
                    </IonButtons>
                  </IonToolbar>
                </IonHeader>

                <IonContent className="ion-padding">
                  {/* 🔹 Selector de actividad para registrar asistencia */}
                  <IonLabel>Actividad</IonLabel>
                  <Select
                    options={cursosFiltrados.map((curso) => ({
                      value: curso.id,
                      label: curso.nombre_curso
                    }))}
                    placeholder="Selecciona una actividad"
                    onChange={(opcion) => setSelectedCurso(opcion?.value || "")}
                  />

                  <IonButton
                    expand="block"
                    className="ion-margin-top"
                    onClick={registrarAsistencia}
                  >
                    Registrar Asistencia
                  </IonButton>

                      <p></p>
                   {/* 🔹 Mostrar actividades ya inscritas */}
                  {decodedData ? (
                          <>
                            <IonLabel>Actividades en las que ya estás inscrito:</IonLabel>
                              <ul style={{ marginBottom: '1rem' }}>
                                {accesosEvento
                                  .filter(
                                    (a) =>
                                      a.id_usuario == decodedData.id_usuario &&
                                      a.id_evento == decodedData.id_evento
                                  )
                                  .map((a, idx) => {
                                    const curso = actividades.find(
                                      (c) => c.id === a.id_curso && c.id_evento === a.id_evento
                                    );

                                  //  console.log("🎯 Curso inscrito:", curso);

                                    return (
                                      <li key={idx}>
                                        ✅ {curso?.nombre_curso || `Curso ID ${a.id_curso}`}
                                      </li>
                                    );
                                  })}
                              </ul>
                          </>
                        ) : (
                          <IonLabel>Cargando información del QR...</IonLabel>
                        )}

                </IonContent>





              </IonModal>



            </>
          ) : ''}

        </>}
    </IonPage>
    
  );
};

export default Cobertura;
