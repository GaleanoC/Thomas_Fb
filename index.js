var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var ngrok = require('ngrok');
var mongoose = require('mongoose');
var app = express();
var port = process.env.PORT || 8080;
var PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
var database = 'test';
var db;
var MongoClient = require('mongodb').MongoClient;
var uri = process.env.URI_MONGODB_ATLAS;
app.listen(port, function () {
    console.log('Corriendo en el puerto ' + port);
});
(function () { return __awaiter(_this, void 0, void 0, function () {
    var url;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ngrok.connect(port)];
            case 1:
                url = _a.sent();
                console.log(url);
                return [2 /*return*/];
        }
    });
}); })();
app.use(bodyParser.json());
app.get('/', function (req, res) {
    res.send('Servidor corriendo');
});
app.get('/webhook', function (req, res) {
    // El identificador de la página. En la configuracion del producto de la pagina asociada.
    var VERIFY_TOKEN = PAGE_ACCESS_TOKEN;
    // Parse the query params
    var mode = req.query['hub.mode'];
    var token = req.query['hub.verify_token'];
    var challenge = req.query['hub.challenge'];
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Verifica en los parametros de la url el mode identico a subscribe 
        // Y si el indentificador de la pagina es correcto
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responde si la condicional fue correcta
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            // Si algunos de los campos no cumple con la condicional
            res.sendStatus(403);
        }
    }
});
app.post('/webhook', function (req, res) {
    var body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
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
                console.log(entry);
                console.log(webhook_event);
                console.log(message_user);
            }
            else if (webhook_event.postback) {
                //
            }
            // Subiendo mensaje a la base de datos
            uploadMessage(entry);
        });
        // Retorna un status '200 OK' 
        res.status(200).send('EVENT_RECEIVED');
    }
    else {
        // Retorna un status '404 Not Found' si el evento no es de una pagina de la subscripción
        res.sendStatus(404);
    }
});
function uploadMessage(data) {
    try {
        MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function (error, client) {
            if (error) {
                console.log(error);
                return console.log('Could not connect to the database');
            }
            try {
                db = client.db(database);
                // Busco a ver si existe la conversacion, esto se debe cambiar por una variable en memoria que tenga las conversaciones.
                db.collection('texts').find({ 'id': data.id }).toArray(function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        // Sino encuentro la conversacion agrego una nueva.
                        if (result <= 0) {
                            var tdata;
                            // Verifica si el mensaje entrante es de tipo texto
                            if (data.messaging[0].message.text) {
                                tdata = {
                                    id: data.id,
                                    time: data.time,
                                    messaging: [data.messaging]
                                };
                                // Este verifica si el mnesaje entrante es una imagen, audio, video u otro archivo
                            }
                            else if (data.messaging[0].message.attachments) {
                                tdata = {
                                    id: data.id,
                                    time: data.time,
                                    messaging: [data.messaging]
                                };
                            }
                            try {
                                db.collection('texts').insertOne(tdata);
                            }
                            catch (e) {
                                console.log('Fallo en Insert a texts');
                            }
                        }
                        else {
                            try {
                                db.collection('texts').updateOne({ 'id': data.id }, { $push: { 'messaging': [data.messaging[0]] } }, function (error) {
                                    if (error) {
                                        console.log(error);
                                    }
                                    else {
                                        console.log('Se agrego con exito');
                                    }
                                });
                            }
                            catch (e) {
                                console.log('Fallo en update a texts');
                            }
                        }
                    }
                });
                // mySalida.emit('Ok');
            }
            catch (e) {
                console.log('Error InsertCola2');
                console.log(e);
            }
            ;
            console.log('Database is connected...');
        });
    }
    catch (e) {
        console.log('Error en InsertCola2...');
        console.log(e);
        // mySalida.emit('Error');
    }
}
