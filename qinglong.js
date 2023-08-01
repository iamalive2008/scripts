var LogDetails = true; //是否开启响应日志, true则开启

var ScriptName = "青龙京东Cookie"

var $nobyda = nobyda();


(function ReadCookie() {
    console.log("ReadCookie 脚本执行成功")
    GetEnvs("111")
    console.log("ReadCookie 脚本执行结束")
})().catch(e => {
    console.log("ReadCookie 脚本执行异常")
    $nobyda.notify(ScriptName, "", e.message || JSON.stringify(e))
}).finally(() => {
    console.log("ReadCookie 脚本执行完成")
    $nobyda.done()
})

function Dump(name, object) {
    console.log(name + ": " + JSON.stringify(object) || object)
}


function GetCookieVal(key, cookies) {

    cookies = cookies.replace(/\s/g, '')

    const value = `;${cookies}`;
    const parts = value.split(`;${key}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return ""
}



function UpdateNewCookie(tokenType, token, pin, key, item) {

    let serverAddr = $nobyda.read("iamalive2008_qinglong_server_addr")

    console.log(`更新 Cookies, pin=${pin}, key=${key}, id=${item.id}`)
    let envsUrl = {
        url: `${serverAddr}/open/envs`,
        headers: {
            "Authorization": `${tokenType} ${token} `
        },
        body: {
            "id": item.id,
            "value": `pt_key=${key}; pt_pin=${pin}`,
            "name": "JD_COOKIE",
            "remarks": "Updated By qinglong.js"
        }
    };

    $nobyda.put(envsUrl, async function (error, response, data) {
        Dump("error", error)
        Dump("response", response)

        try {
            if (error) {
                throw new Error(error)
            } else {
                const cc = JSON.parse(data)
                if (cc.code == 200) {
                    $nobyda.notify("青龙京东 Cookie", "更新 Cookie", `【账户${item.id}】${pin} 更新成功!`); 
                }
            }
        } catch (eor) {
            $nobyda.AnError("青龙", "Token", eor, response, data)
        } finally {
            resolve()
        }
    })

}


function InsertNewCookie(tokenType, token, pin, key) {


    let serverAddr = $nobyda.read("iamalive2008_qinglong_server_addr")
    let clientId = $nobyda.read("iamalive2008_qinglong_client_id")
    let clientSecret = $nobyda.read("iamalive2008_qinglong_client_secret")

    let envsUrl = {
        url: `${serverAddr}/open/envs`,
        headers: {
            "Authorization": `${tokenType} ${token} `
        },
        body: [
            {
                "value": `pt_key=${key}; pt_pin=${pin}`,
                "name": "JD_COOKIE",
                "remarks": ""
            }
        ]
    };

    $nobyda.post(envsUrl, async function (error, response, data) {
        Dump("error", error)
        Dump("response", response)

        try {
            if (error) {
                throw new Error(error)
            } else {
                const cc = JSON.parse(data)
                if (cc.code == 200) {
                    $nobyda.notify("青龙京东 Cookie", "新增 Cookie", `【账户${cc.data.id}】${pin} 创建成功!`); 
                }
            }
        } catch (eor) {
            $nobyda.AnError("青龙", "Token", eor, response, data)
        } finally {
            resolve()
        }

    })

}

function UpsertEnvsByToken(tokenType, token, newCookie) {

    let serverAddr = $nobyda.read("iamalive2008_qinglong_server_addr")
    let clientId = $nobyda.read("iamalive2008_qinglong_client_id")
    let clientSecret = $nobyda.read("iamalive2008_qinglong_client_secret")

    console.log(`Read prefs serverAddr=${serverAddr} clientId=${clientId} clientSecret=${clientSecret}`)

    let envsUrl = {
        url: `${serverAddr}/open/envs`,
        headers: {
            "Authorization": `${tokenType} ${token} `
        }
    };

    $nobyda.get(envsUrl, async function (error, response, data) {
        Dump("error", error)
        Dump("response", response)
        // Dump("data", data)
        let newPin = GetCookieVal("pt_pin", newCookie)
        let newKey = GetCookieVal("pt_key", newCookie)

        try {
            if (error) {
                throw new Error(error)
            } else {
                const cc = JSON.parse(data)
                if (cc.code == 200) {
                    var cookieEnvs = []

                    for (let item of cc.data) {
                        if (item.name == "JD_COOKIE") {
                            cookieEnvs.push(item)
                        }
                    }

                    //  Dump("cookieEnvs", cookieEnvs)




                    for (let item of cookieEnvs) {
                        let ck = item.value
                        let ptPin = GetCookieVal("pt_pin", item.value)
                        let ptKey = GetCookieVal("pt_key", item.value)
                        console.log(`pin=${ptPin}; key=${ptKey}`)
                        if (ptPin == newPin) {
                            UpdateNewCookie(tokenType, token,newPin, newKey, item)
                            break
                        }
                    }

                    InsertNewCookie(tokenType, token, newPin, newKey)


                } else {
                    throw new Error(`青龙登录失败: ${data}`)
                }
            }
        }
        catch (eor) {
            $nobyda.AnError("青龙", "Token", eor, response, data)
        } finally {
            resolve()
        }
    })
}


function GetEnvs(newCookie) {

    let serverAddr = $nobyda.read("iamalive2008_qinglong_server_addr")
    let clientId = $nobyda.read("iamalive2008_qinglong_client_id")
    let clientSecret = $nobyda.read("iamalive2008_qinglong_client_secret")

    console.log(`Read prefs serverAddr=${serverAddr} clientId=${clientId} clientSecret=${clientSecret}`)

    let tokenUrl = {
        url: `${serverAddr}/open/auth/token?client_id=${clientId}&client_secret=${clientSecret}`,
        headers: {
        }
    };

    const myRequest = {
        url: `${serverAddr}/open/auth/token?client_id=${clientId}&client_secret=${clientSecret}`,
    };
    
    $task.fetch(myRequest).then(response => {
        // response.statusCode, response.headers, response.body
        console.log(response.body);
        $notify("Title", "Subtitle", response.body); // Success!
        // $done();
    }, reason => {
        // reason.error
        $notify("Title", "Subtitle", reason.error); // Error!
        // $done();
    });

    // $task.fetch(tokenUrl).then(response => {
    //     Dump("response", response)
    //     // callback(null, adapterStatus(response), response.body)
    // }, reason => {
    //     Dump("reason", reason)
    //     // callback(reason.error, null, null)
    // })
    return

    $nobyda.get(tokenUrl, async function (error, response, data) {
        Dump("error", error)
        Dump("response", response)
        Dump("data", data)

        try {
            if (error) {
                throw new Error(error)
            } else {
                const cc = JSON.parse(data)
                if (cc.code == 200) {
                    UpsertEnvsByToken(cc.data.token_type, cc.data.token, newCookie)
                } else {
                    throw new Error(`青龙登录失败: ${data}`)
                }
            }
        }
        catch (eor) {
            $nobyda.AnError("青龙", "Token", eor, response, data)
        } finally {
            resolve()
        }
    })
}



function CookieUpdate(oldValue, newValue) {
    console.log("更新Cookie, " + "Old:" + oldValue + ", New:" + newValue)
    let item, type, name = (oldValue || newValue || '').split(/pt_pin=(.+?);/)[1];
    console.log("更新Cookie, 账号：" + name)
    GetEnvs(newValue)
    //     let total = $nobyda.read('CookiesJD');
    //     try {
    //       total = checkFormat(JSON.parse(total || '[]'));
    //     } catch (e) {
    //       $nobyda.notify("京东签到", "", "Cookie JSON格式不正确, 即将清空\n可前往日志查看该数据内容!");
    //       console.log(`京东签到Cookie JSON格式异常: ${e.message||e}\n旧数据内容: ${total}`);
    //       total = [];
    //     }
    //     for (let i = 0; i < total.length; i++) {
    //       if (total[i].cookie && new RegExp(`pt_pin=${name};`).test(total[i].cookie)) {
    //         item = i;
    //         break;
    //       }
    //     }
    //     if (newValue && item !== undefined) {
    //       type = total[item][path] === newValue ? -1 : 2;
    //       total[item][path] = newValue;
    //       item = item + 1;
    //     } else if (newValue && path === 'cookie') {
    //       total.push({
    //         cookie: newValue
    //       });
    //       type = 1;
    //       item = total.length;
    //     }
    //     return {
    //       total: checkFormat(total),
    //       type, //-1: same, 1: add, 2:update
    //       item,
    //       name: decodeURIComponent(name)
    //     };
}

function GetCookie() {
    const req = $request;
    if (req.method != 'OPTIONS' && req.headers) {
        const CV = (req.headers['Cookie'] || req.headers['cookie'] || '');
        const ckItems = CV.match(/(pt_key|pt_pin)=.+?;/g);
        if (/^https:\/\/(me-|)api(\.m|)\.jd\.com\/(client\.|user_new)/.test(req.url)) {
            if (ckItems && ckItems.length == 2) {
                // $nobyda.notify(ScriptName, "",  ckItems.join('')) 

                CookieUpdate(null, ckItems.join(''))

                // const value = CookieUpdate(null, ckItems.join(''))
                // if (value.type !== -1) {
                //     const write = $nobyda.write(JSON.stringify(value.total, null, 2), "CookiesJD")
                //     $nobyda.notify(`用户名: ${value.name}`, ``, `${value.type == 2 ? `更新` : `写入`}京东 [账号${value.item}] Cookie${write ? `成功 🎉` : `失败 ‼️`}`)
                // } else {
                //     console.log(`\n用户名: ${value.name}\n与历史京东 [账号${value.item}] Cookie相同, 跳过写入 ⚠️`)
                // }
            } else {
                throw new Error("写入Cookie失败, 关键值缺失\n可能原因: 非网页获取 ‼️");
            }
        } else if (req.url === 'http://www.apple.com/') {
            throw new Error("类型错误, 手动运行请选择上下文环境为Cron");
        }
    } else if (!req.headers) {
        throw new Error("写入Cookie失败, 请检查匹配URL或配置内脚本类型");
    }
}


// Modified from yichahucha
function nobyda() {
    const start = Date.now()
    const isRequest = typeof $request != "undefined"
    const isSurge = typeof $httpClient != "undefined"
    const isQuanX = typeof $task != "undefined"
    const isLoon = typeof $loon != "undefined"
    const isJSBox = typeof $app != "undefined" && typeof $http != "undefined"
    const isNode = typeof require == "function" && !isJSBox;
    const NodeSet = 'CookieSet.json'
    const node = (() => {
        if (isNode) {
            const request = require('request');
            const fs = require("fs");
            const path = require("path");
            return ({
                request,
                fs,
                path
            })
        } else {
            return (null)
        }
    })()
    const notify = (title, subtitle, message, rawopts) => {
        const Opts = (rawopts) => { //Modified from https://github.com/chavyleung/scripts/blob/master/Env.js
            if (!rawopts) return rawopts
            if (typeof rawopts === 'string') {
                if (isLoon) return rawopts
                else if (isQuanX) return {
                    'open-url': rawopts
                }
                else if (isSurge) return {
                    url: rawopts
                }
                else return undefined
            } else if (typeof rawopts === 'object') {
                if (isLoon) {
                    let openUrl = rawopts.openUrl || rawopts.url || rawopts['open-url']
                    let mediaUrl = rawopts.mediaUrl || rawopts['media-url']
                    return {
                        openUrl,
                        mediaUrl
                    }
                } else if (isQuanX) {
                    let openUrl = rawopts['open-url'] || rawopts.url || rawopts.openUrl
                    let mediaUrl = rawopts['media-url'] || rawopts.mediaUrl
                    return {
                        'open-url': openUrl,
                        'media-url': mediaUrl
                    }
                } else if (isSurge) {
                    let openUrl = rawopts.url || rawopts.openUrl || rawopts['open-url']
                    return {
                        url: openUrl
                    }
                }
            } else {
                return undefined
            }
        }
        console.log(`${title}\n${subtitle}\n${message}`)
        if (isQuanX) $notify(title, subtitle, message, Opts(rawopts))
        if (isSurge) $notification.post(title, subtitle, message, Opts(rawopts))
        if (isJSBox) $push.schedule({
            title: title,
            body: subtitle ? subtitle + "\n" + message : message
        })
    }
    const write = (value, key) => {
        if (isQuanX) return $prefs.setValueForKey(value, key)
        if (isSurge) return $persistentStore.write(value, key)
        if (isNode) {
            try {
                if (!node.fs.existsSync(node.path.resolve(__dirname, NodeSet)))
                    node.fs.writeFileSync(node.path.resolve(__dirname, NodeSet), JSON.stringify({}));
                const dataValue = JSON.parse(node.fs.readFileSync(node.path.resolve(__dirname, NodeSet)));
                if (value) dataValue[key] = value;
                if (!value) delete dataValue[key];
                return node.fs.writeFileSync(node.path.resolve(__dirname, NodeSet), JSON.stringify(dataValue));
            } catch (er) {
                return AnError('Node.js持久化写入', null, er);
            }
        }
        if (isJSBox) {
            if (!value) return $file.delete(`shared://${key}.txt`);
            return $file.write({
                data: $data({
                    string: value
                }),
                path: `shared://${key}.txt`
            })
        }
    }
    const read = (key) => {
        if (isQuanX) return $prefs.valueForKey(key)
        if (isSurge) return $persistentStore.read(key)
        if (isNode) {
            try {
                if (!node.fs.existsSync(node.path.resolve(__dirname, NodeSet))) return null;
                const dataValue = JSON.parse(node.fs.readFileSync(node.path.resolve(__dirname, NodeSet)))
                return dataValue[key]
            } catch (er) {
                return AnError('Node.js持久化读取', null, er)
            }
        }
        if (isJSBox) {
            if (!$file.exists(`shared://${key}.txt`)) return null;
            return $file.read(`shared://${key}.txt`).string
        }
    }
    const adapterStatus = (response) => {
        if (response) {
            if (response.status) {
                response["statusCode"] = response.status
            } else if (response.statusCode) {
                response["status"] = response.statusCode
            }
        }
        return response
    }
    const get = (options, callback) => {
        if (isQuanX) {
            if (typeof options == "string") options = {
                url: options
            }
            options["method"] = "GET"
            //options["opts"] = {
            //  "hints": false
            //}
            Dump("options", options)

            $task.fetch(options).then(response => {
                Dump("response", response)
                callback(null, adapterStatus(response), response.body)
            }, reason => {
                Dump("reason", reason)
                callback(reason.error, null, null)
            })
        }
        if (isSurge) {
            options.headers['X-Surge-Skip-Scripting'] = false
            $httpClient.get(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isNode) {
            node.request(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isJSBox) {
            if (typeof options == "string") options = {
                url: options
            }
            options["header"] = options["headers"]
            options["handler"] = function (resp) {
                let error = resp.error;
                if (error) error = JSON.stringify(resp.error)
                let body = resp.data;
                if (typeof body == "object") body = JSON.stringify(resp.data);
                callback(error, adapterStatus(resp.response), body)
            };
            $http.get(options);
        }
    }
    const post = (options, callback) => {
        options.headers['Content-Type'] = 'application/json'

        if (isQuanX) {
            if (typeof options == "string") options = {
                url: options
            }
            options["method"] = "POST"
            //options["opts"] = {
            //  "hints": false
            //}
            $task.fetch(options).then(response => {
                callback(null, adapterStatus(response), response.body)
            }, reason => callback(reason.error, null, null))
        }
        if (isSurge) {
            options.headers['X-Surge-Skip-Scripting'] = false
            $httpClient.post(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isNode) {
            node.request.post(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isJSBox) {
            if (typeof options == "string") options = {
                url: options
            }
            options["header"] = options["headers"]
            options["handler"] = function (resp) {
                let error = resp.error;
                if (error) error = JSON.stringify(resp.error)
                let body = resp.data;
                if (typeof body == "object") body = JSON.stringify(resp.data)
                callback(error, adapterStatus(resp.response), body)
            }
            $http.post(options);
        }
    }


    const put = (options, callback) => {
        options.headers['Content-Type'] = 'application/json'
        if (isQuanX) {
            if (typeof options == "string") options = {
                url: options
            }
            options["method"] = "PUT"
            //options["opts"] = {
            //  "hints": false
            //}
            $task.fetch(options).then(response => {
                callback(null, adapterStatus(response), response.body)
            }, reason => callback(reason.error, null, null))
        }
        if (isSurge) {
            options.headers['X-Surge-Skip-Scripting'] = false
            $httpClient.put(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isNode) {
            node.request.put(options, (error, response, body) => {
                callback(error, adapterStatus(response), body)
            })
        }
        if (isJSBox) {
            if (typeof options == "string") options = {
                url: options
            }
            options["header"] = options["headers"]
            options["handler"] = function (resp) {
                let error = resp.error;
                if (error) error = JSON.stringify(resp.error)
                let body = resp.data;
                if (typeof body == "object") body = JSON.stringify(resp.data)
                callback(error, adapterStatus(resp.response), body)
            }
            $http.put(options);
        }
    }


    const AnError = (name, keyname, er, resp, body) => {
        if (typeof (merge) != "undefined" && keyname) {
            if (!merge[keyname].notify) {
                merge[keyname].notify = `${name}: 异常, 已输出日志 ‼️`
            } else {
                merge[keyname].notify += `\n${name}: 异常, 已输出日志 ‼️ (2)`
            }
            merge[keyname].error = 1
        }
        return console.log(`\n‼️${name}发生错误\n‼️名称: ${er.name}\n‼️描述: ${er.message}${JSON.stringify(er).match(/\"line\"/) ? `\n‼️行列: ${JSON.stringify(er)}` : ``}${resp && resp.status ? `\n‼️状态: ${resp.status}` : ``}${body ? `\n‼️响应: ${resp && resp.status != 503 ? body : `Omit.`}` : ``}`)
    }
    const time = () => {
        const end = ((Date.now() - start) / 1000).toFixed(2)
        return console.log('\n签到用时: ' + end + ' 秒')
    }
    const done = (value = {}) => {
        if (isQuanX) return $done(value)
        if (isSurge) isRequest ? $done(value) : $done()
    }
    return {
        AnError,
        isRequest,
        isJSBox,
        isSurge,
        isQuanX,
        isLoon,
        isNode,
        notify,
        write,
        read,
        get,
        post,
        put,
        time,
        done
    }
};