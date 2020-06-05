require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const ngrok = require("ngrok");

const app = express();
const port = process.env.PORT || 8080;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const database = "test";
var db: any;
const MongoClient = require("mongodb").MongoClient;
const uri = process.env.URI_MONGODB_ATLAS;

const regex: any =  /[Vv0-9-.,]{6,11}/;


app.listen(port , () => {
    console.log("Corriendo en el puerto " + port);
});

(async () => {
    const url = await ngrok.connect(port);
    console.log(url);
  })();

app.use(bodyParser.json());

app.get("/", (req: any, res: any) => {
    res.send("Servidor corriendo");
});

app.get("/webhook", (req: any, res: any) => {

    // El identificador de la página. En la configuracion del producto de la pagina asociada.
    let VERIFY_TOKEN = PAGE_ACCESS_TOKEN;
      
    // Parse the query params
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Verifica en los parametros de la url el mode identico a subscribe 
      // Y si el indentificador de la pagina es correcto
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        
        // Responde si la condicional fue correcta
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      
      } else {
        // Si algunos de los campos no cumple con la condicional
        res.sendStatus(403);      
      }
    }
});

app.post("/webhook", (req: any, res: any) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === "page") {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry: any) {

      // Obtiene el mensaje del usuario. entry.messaging es un array, pero 
      // siempre contendra un solo mensaje, entonces se obtiene la posicion 0
      var webhook_event = entry.messaging[0];
    
      // Obtencion del sender PSID, indentificador que se le asigna a
      // a cada persona que inicia el chat con el bot
      // var sender_psid = webhook_event.sender.id;

      var message_user = webhook_event.message;
      
      // Verificando si el evento es un mensaje 
      //Si no el evento es un postback
      if (message_user) {
        
      } else if (webhook_event.postback) {
        //
      }
      // Subiendo mensaje a la base de datos
      uploadMessage(entry);

      var nationalID;

      if (regex.test(message_user.text)) {
        nationalID = regex.exec(message_user.text)[0];
        cleanId(nationalID);
        console.log("CI proporcionada por el usuario", nationalID);
    
      } else {
          console.log("El dato buscado no parece coincidir con con un posible ID VE");
      }

    });
    
    // Retorna un status "200 OK" 
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Retorna un status "404 Not Found" si el evento no es de una pagina de la subscripción
    res.sendStatus(404);
  }
  
});

function  uploadMessage(data: any) {
  try {
    MongoClient.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true}, (error: any, client: { db: (arg0: any) => any; })=>{
      if(error){
        console.log(error);          
        return console.log("Could not connect to the database");            
      } 
      try {
          db = client.db(database);           
              // Busco a ver si existe la conversacion, esto se debe cambiar por una variable en memoria que tenga las conversaciones.
              db.collection("texts").find({ "id": data.id }).toArray(function(err:any, result:any) {
                if (err) {
                    console.log(err);
                } else {
                    // Sino encuentro la conversacion agrego una nueva.
                    if(result<= 0){
                      var tdata;
                      // Verifica si el mensaje entrante es de tipo texto
                      if(data.messaging[0].message.text) {
                        tdata = {
                          id: data.id,
                          time: data.time,
                          messaging: [data.messaging]                        
                        }
                      // Este verifica si el mnesaje entrante es una imagen, audio, video u otro archivo
                      } else if (data.messaging[0].message.attachments) {
                        tdata = {
                          id: data.id,
                          time: data.time,
                          messaging: [data.messaging]                        
                        }
                      }
                        try {
                          db.collection("texts").insertOne(tdata); 
                        } catch (e) { 
                        console.log("Fallo en Insert a texts");
                        }

                    } else {
                      try {
                        db.collection("texts").updateOne({ "id": data.id }, { $push: {"messaging": [data.messaging[0]]} }, function (error: any) {
                          if (error) {
                            console.log(error);
                          } else {
                            console.log("Se agrego con exito");
                          }
                          
                        });
                      } catch (e) { 
                        console.log("Fallo en update a texts");
                      }
                }}
            });

        // mySalida.emit("Ok");
      } catch (e) {
        console.log("Error InsertCola2");
        console.log(e);
      };
      console.log("Database is connected...");
  });
  } catch (e) {
    console.log("Error en InsertCola2...");
    console.log(e);
    // mySalida.emit("Error");
  }
}






// Limpiar CI dada por el usuario

function cleanId(id: any) { 
  let idve = id;
  const clean = /[-.,]/g; // elimina todos los puntos, comas y guiones que acompañan al ID
  let idclean = idve.replace(clean, "");
  // Despues de retirarle los pontos, comoas o guiones
  // Pasa a la validacion de ese numero de ID 
  console.log(validateIdentidad(idclean));
}

// Validación de la CI obtenida

function validateIdentidad(idVE: any) {

  var validFormat, 
      validLength, 
      validVigencia;

  validLength = function validLength(idVE: any) {
      return  idVE.length >= 6 && idVE.length <=8;
      // Esta condicion indica si la cedula tiene entre 6 y 8 digitos necesarios
      // Sin inlcuir puntos, guiones o comas 
  }

  validFormat = function validFormat(idVE: any){
      return /[Vv0-9]{6,8}/.test(idVE);
      // Evalua el formato de la cedula  si son unicamente digitos
      // Sin inlcuir puntos, guiones o comas
  }

  validVigencia = (idVE: any) => {
      let idNumber = parseInt(idVE);
      // Busca de manera arbitraria la vigencia de cierto numero de cedulas
      // Con cierto rango
      if(idNumber > 800000 && idNumber < 32000000){
          console.log("Este CI es mayor a 800000 y menor a 32.000.000 es posible que tenga vigencia");
          return true;
      } else if(idNumber > 32000000){
          console.log("Es poco probable que exista una actualmente un CI mayor a 32.000.000");
          return false;
      } else { 
          console.log("Es posible que si exista este numero de CI, pero ya no debe tener vigencia actualmente");
          return false;
      }
          
      
  }
  
  if (validLength(idVE) && validFormat(idVE) && validVigencia(idVE)) {
      console.log("Si validLength, validFormat y validVigencia son true, es muy porbable que sea un CI VE vigente")
  } else {
      console.log("No cumple con las condiones para ser una cedula venezolana vigente");
  }

  return validLength(idVE) && validFormat(idVE) && validVigencia(idVE);

}
