const express = require('express');
const { Client } = require('@notionhq/client');
const moment = require('moment');
require('dotenv').config();
const fs = require("fs");
const https = require("https")
const http = require("http")

const cors = require('cors');
var bodyParser = require('body-parser');
const { user } = require('firebase-functions/v1/auth');
var jsonParser = bodyParser.json();

const app = express();
//var privateKey  = fs.readFileSync('./sslcert/server.key', 'utf8');
//var certificate = fs.readFileSync('./sslcert/server.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};

app.use(cors());

const eventsId = process.env.NOTION_EVENTS_DATABASE_ID;
const usersId = process.env.NOTION_USERS_DATABASE_ID;
const settingsId = process.env.NOTION_SETTINGS_DATABASE_ID;
const eliminationsId = process.env.NOTION_ELIMINATIONS_DATABASE_ID;
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
            },
            Eliminations: {
                number: 0
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

app.post("/getEliminations", jsonParser, async (req,res) => {
    
    const payload = {
        database_id: eliminationsId,
        filter: {
            property: "Date",
            date: {
                on_or_after: moment().subtract(2, "days"),
            },
        },
        sorts: [
            {
                property: 'Date',
                direction: 'descending'
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


app.post("/handleElimination", jsonParser, async(req,res) => {

    const userEliminated = req.body.userEliminated;
    const assassin = req.body.assassin;

    console.log(userEliminated)

    const payload1 = {
        database_id: usersId,
        filter: {
            property: "UID",
            rich_text: {
                equals: userEliminated,
            },
        }
    }

    const payload2 = {
        database_id: usersId,
        filter: {
            property: "UID",
            rich_text: {
                equals: assassin,
            },
        }
    }

    try {
        const eliminatedResp = await notion.databases.query(payload1);
        const eliminatedPageId = eliminatedResp.results[0].id
        const assassinResp = await notion.databases.query(payload2);
        const assassinPageId = assassinResp.results[0].id

    if(assassinResp.results[0].properties.Alive.checkbox){
        if(eliminatedResp.results[0].properties.Alive.checkbox)
            {await notion.pages.update({
            page_id: eliminatedPageId,
            properties: {
                'Alive': {
                    checkbox: false,
                },
            },
        })
        
        const assassinKills = assassinResp.results[0].properties.Eliminations.number
        await notion.pages.update({
            page_id: assassinPageId,
            properties: {
                'Eliminations': {
                    number: assassinKills+1,
                },
            },
        })

        const eliminationReport = {
            "userEliminated":eliminatedResp.results[0].properties.Name.title[0].plain_text,
            "assassin":assassinResp.results[0].properties.Name.title[0].plain_text,
            "assassinNewKills":assassinKills+1
        }

        await notion.pages.create({
            parent: {
                type: "database_id",
                database_id: eliminationsId
            },
            properties: {
                Eliminated: {
                    title: [
                        {
                            text: {
                                content: eliminationReport.userEliminated
                            }
                        }
                    ]
                },
                Assassin: {
                    rich_text: [
                        {
                        text: {
                            content: eliminationReport.assassin
                        }
                    }
                    ]
                },
                "Assassin Kills Now": {
                    number: eliminationReport.assassinNewKills
                },
                Date:{
                    date:{
                        start: moment().toISOString()
                    }
                }

            }
        })
        res.json(
            eliminationReport);
        }else{
                res.json({
                    "error":"This person is already eliminated",
                    "error-code":2
                })
            }
    }else{
        res.json({
            "error":"Assassin is not alive and cannot eliminate.",
            "error-code":1
        })
    }
        return;

    } catch (error) {
        console.log(error);
        res.json({
            "error":"User UID Unknown",
            "error-code": 0,
            "eliminated-UID": userEliminated,
            "assassin-UID": assassin
        })
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

//var httpsServer = https.createServer(credentials, app);

try {
    //httpsServer.listen(8443);
    http.createServer(app).listen(4000)
    console.log("Started server on 8443")
} catch (error) {
    console.log(error)
}
