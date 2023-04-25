const express = require('express');
const { Client } = require('@notionhq/client');
const moment = require('moment');
require('dotenv').config();
const fs = require("fs");
const https = require("https")

const cors = require('cors');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

const app = express();
var privateKey  = fs.readFileSync('./sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('./sslcert/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

app.use(cors());

const eventsId = process.env.NOTION_EVENTS_DATABASE_ID;
const usersId = process.env.NOTION_USERS_DATABASE_ID;
const settingsId = process.env.NOTION_SETTINGS_DATABASE_ID;
const notion = new Client({auth:process.env.NOTION_INTEGRATION_TOKEN});

const date = moment().format();

//POST request
//POST name, UID
app.post("/addUser", jsonParser, async(req, res) => {
    //req,body
    /*{
        name: Name from form
        UID: from auth
    }*/
    const name = req.body.name;
    const UID = req.body.UID;

    console.log(UID)
    console.log(name)
    
    /*const payload = {
        database_id: usersId,
        filter: {
            property: "UID",
            rich_text: {
                equals: uid
            },
        }
    }*/
    const payload = {
        parent: {
            database_id: usersId,
        },
        properties: {
            Name:{
                title: [
                    {
                        text: {
                            content: name
                        }
                    }
                ]
            },
            UID: {
                rich_text: [
                    {
                    text: {
                        content: UID
                    }
                }
                ]
            }
        }
    }

    try {
        const response = await notion.pages.create(payload);
       
        console.log(response)
        res.json(response);
        return;

    } catch (error) {
        console.log(error);
    }
});

app.post("/getLatestEvent", jsonParser, async (req,res) => {
    
    const payload = {
        database_id: eventsId,
        filter: {
            property: "Date",
            date: {
                on_or_after: date,
            },
        },
        sorts: [
            {
                property: 'Date',
                direction: 'ascending'
            }
        ]
    }
 
    try {
        const response = await notion.databases.query(payload);
       
        console.log(response)
        res.json(response);
        return;

    } catch (error) {
        console.log(error);
    }


});

app.post("/getAllPlayers", jsonParser, async(req, res) => {
    payload = {
    database_id: usersId,
    filter: {
        property: "Alive",
        checkbox: {
            equals: true,
        },
      },
    sorts: [
        {
            property: "Order",
            direction: "ascending"
        }
    ]
}

    try {
        const response = await notion.databases.query(payload);
       
        console.log(response)
        res.json(response);
        return;

    } catch (error) {
        console.log(error);
    }


})

app.post("/getSettings", jsonParser, async(req, res) => {
    const payload = {
        database_id: settingsId
    }

    try {
        const response = await notion.databases.query(payload);
       
        console.log(response)
        res.json(response);
        return;

    } catch (error) {
        console.log(error);
    }
})

//POST request
//POST eventName, date
app.post("/getUser", jsonParser, async(req, res) => {
    //req,body
    /*{
        uid: {UID FROM AUTH}
    }*/
    const uid = req.body.uid;
    
    /*const payload = {
        database_id: usersId,
        filter: {
            property: "UID",
            rich_text: {
                equals: uid
            },
        }
    }*/
    const payload = {
        database_id: usersId,
        filter: {
            property: "UID",
            rich_text: {
                equals: uid,
            },
        }
    }

    try {
        const response = await notion.databases.query(payload);
       
        console.log(response)
        res.json(response);
        return;

    } catch (error) {
        console.log(error);
    }
});

var httpsServer = https.createServer(credentials, app);

try {
    httpsServer.listen(8443);
    console.log("Started server on 8443")
} catch (error) {
    console.log(error)
}
