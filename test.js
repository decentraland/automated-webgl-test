const fs = require('fs')
const puppeteer = require('puppeteer')

var count = 0
function to(file) {
    const result = { path: `./output/${('' + count).padStart(2, '0')}-${file}.png` }
    count++;
    return result
}

if (!module.parent) {
    try {
        e2etest('faker+1@decentraland.org', [
            [(_) => _.page.mouse.move(400, 400)],
            [(_) => _.page.mouse.down()],
            [(_) => _.page.mouse.up()],
            [(_) => _.sleep(1000)],
            [(_) => _.screenshot(to(`start-faker1`))],
            [(_) => _.sleep(1000)],
            [(_) => _.page.mouse.move(400, 800)],
            [(_) => _.sleep(1000)],
            [(_) => _.screenshot(to(`after-move`))],
            [(_) => _.keyDown('KeyW')],
            [(_) => _.sleep(1000)],
            [(_) => _.keyUp('KeyW')],
            [(_) => _.screenshot(to(`moved-1sec-forward-faker1`))],
            [(_) => _.keyDown('ArrowLeft')],
            [(_) => _.sleep(1000)],
            [(_) => _.keyUp('ArrowLeft')],
            [(_) => _.screenshot(to(`moved-1sec-left-faker1`))],
            [(_) => _.press('Enter')],
            [(_) => _.sleep(100)],
            [(_) => _.sendText('Hello world!')],
            [(_) => _.screenshot(to(`typed-helloworld-faker1`))],
            [(_) => _.press('Enter')],
            [(_) => _.sleep(1000)],
            [(_) => _.press('Enter')],
            [(_) => _.screenshot(to(`end-faker1`))],
        ]).then(() => {
        }).catch(e => {
            console.log(e)
            process.exit(1)
        })
    } catch (e) {
        console.log(e)
        process.exit(1)
    }
}

async function e2etest(email, actions) {
    const start = new Date().getTime()
    const client = await enterClient(email)
    const timeLoading = ((new Date().getTime() - start) / 1000).toFixed(3)
    console.log(`Took ${timeLoading} seconds to load`)
    await client.screenshot(to('client-loaded'))
    for (let action of actions) {
        try {
            await action[0](client)
        } catch (err) {
            console.log(`Could not execute: ${action[0].toString()}:`, err)
        }
    }
    await client.browser.close()
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time))
}

async function enterClient(email) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-port=8084'] })
    const page = await browser.newPage()
    page.on('console', _ => {
        fs.appendFileSync('./output/console.txt', _._text + '\n')
        if (_._text.toString().includes('WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost')) {
            console.log(`Problem: WebGL context loss`)
            process.exit(1)
        }
    })
    page.setViewport({ width: 1280, height: 720 })

    await page.goto('https://play.decentraland.org/')
    await page.waitForTimeout({ 'waitUntil': 'domcontentloaded' })
    await sleep(10000)
    await page.waitForTimeout('#agree-check', { timeout: 3000 })
    await page.click('#agree-check')
    await sleep(2000)
    await page.waitForTimeout(() => !document.querySelector('#eth-login-confirm-button[disabled]'), { timeout: 3000 })
    await page.click('#eth-login-confirm-button')
    await sleep(2000)
    await page.waitForTimeout('#overlay[style*="display"][style*="none"]', { timeout: 2000 })
    await page.screenshot(to(`client-entering`))
    const counter = {
        attempt: 0
    }
    while (counter.attempt < 60) {
        counter.attempt++
        try {
            await page.waitForTimeout('#gameContainer.loaded', { timeout: 1000 })
            await sleep(1000)
            const res = await page.evaluate(`(function() {
              const state = globalStore.getState().loading
              console.log(JSON.stringify(state, null, 2))
              return (
                  state.subsystemsLoad === 100 &&
                  state.pendingScenes === 0 &&
                  state.loadPercentage > 0 &&
                  state.initialLoad === false
              )
            })()
            `)
            if (res === true) {
                break;
            }
        } catch (e) {
            if (counter.attempt === 60) {
                await page.screenshot(to('client-enter-error'))
                throw e
            } else {
                continue
            }
        }
    }
    await sleep(15000)
    return {
        ...page,
        page,
        click: function (...args) {
            return page.mouse.click(...args)
        },
        screenshot: function (...args) {
            return page.screenshot(...args)
        },
        keyUp: function (...args) {
            return page.keyboard.up(...args)
        },
        keyDown: function (...args) {
            return page.keyboard.down(...args)
        },
        press: function (...args) {
            return page.keyboard.press(...args)
        },
        sendText: function (...args) {
            return page.keyboard.type(...args)
        },
        close: function () {
            return browser.close()
        },
        sleep,
        browser,
    }
}
