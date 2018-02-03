#!/usr/bin/env node
require('dotenv').config({path: __dirname + '/.env'});
const fs = require("fs");
const program = require('commander');
const axios = require('axios');

program
    .arguments('<file>')
    .option('-u, --username <username>', 'The user to authenticate as')
    //.option('-p, --password <password>', 'The user\'s password')
    .option('-d, --description <description>', 'A description for the gist being uploaded or edited')
    .action(function(file) {
        //console.log('user: %s pass: %s file: %s',
        //program.username, program.password, file);
        (function () {
            return new Promise(function(resolve, reject) {
                fs.readFile(file, 'utf8', function (err, data) {
                    if (err) reject(err);
                    resolve({fileName: file, fileContent: data});
                });
            });
        })()
        .then(function (localFileObj) { // get the users current gists
            return axios({
                method: 'get',
                url: 'https://api.github.com/users/' + program.username + '/gists',
                headers: {
                  'Accept' : 'application/vnd.github.v3+json',
                  'Authorization' : 'token ' + process.env.API_KEY
                }
            }).then(function (responce) {
                //console.log({responce: responce});
                let gistNames = responce.data.reduce(function (arr, gist) {
                    let thisGistFileNames = [];
                    if(Object.keys(gist.files).length != 1) return arr;
                    for(let fileName in gist.files) thisGistFileNames.push(fileName);
                    return thisGistFileNames.concat(arr);
                }, []);
                console.log({gistNames: gistNames});
                if(gistNames.includes(localFileObj.fileName)) { // gist exist so find its id for editing
                    let id = responce.data.reduce(function (id, gist) {
                        if(Object.keys(gist.files).includes(localFileObj.fileName)) id = gist.id;
                        return id;
                    }, null);
                    localFileObj.editid = id;
                    return localFileObj;
                } else return localFileObj;
            });
        })
        .then(function (localFileObj) { // Upload gist to github
            let files = {};
            files[localFileObj.fileName] = {
                content: localFileObj.fileContent
            };
            return axios({
                method: localFileObj.hasOwnProperty('editid') ? 'patch' : 'post',
                url: 'https://api.github.com/gists' + (localFileObj.hasOwnProperty('editid') ? '/' + localFileObj.editid : ''),
                headers: {
                  'Accept' : 'application/vnd.github.v3+json',
                  'Authorization' : 'token ' + process.env.API_KEY
                },
                data: {
                    description: program.description,
                    files: files
                }
            });
        })
        .then(function (responce) {
            //console.log({FinalResponce:responce});
            if(responce.status === 201) console.log('File uploaded good work yo!');
            else if(responce.status === 200) console.log('File updated good work yo!');
            else throw "not a 201 I'll tell you that much";
        })
        .catch(function (e) {
            if(e.code == 'ENOTFOUND') console.log('File already exist');
            console.log({error: e});
        })
    })
    .parse(process.argv);



