const fs = require('fs')
const puppeteer = require('puppeteer')
const { exec } = require('child_process')

var count = 0
function to(file) {
    const result = { path: `./output/${('' + count).padStart(2, '0')}-${file}.png` }
    count++;
    return result
}

if (!module.parent) {
    try {
        e2etest('faker+1@decentraland.org', [
            [(_) => _.screenshot(to(`start-0`))],
            [(_) => _.sleep(10000)],
            [(_) => _.page.mouse.click(640, 460, { button: 'left' })],        // Focus on WebGL
            [(_) => _.page.mouse.move(0, 800, {
                steps: 10
            })],
            [(_) => _.page.mouse.move(400, 800)],
            [(_) => _.screenshot(to(`start-after-clicks`))],
            [(_) => _.sleep(1000)],
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
            [(_) => _.screenshot(to(`sent-message`))],
            [(_) => _.press('Enter')],
            [(_) => _.sleep(1000)],
            [(_) => _.page.mouse.move(400, 800)],
            [(_) => _.sleep(1000)],
            [(_) => _.page.mouse.move(0, 800)],
            [(_) => _.screenshot(to(`after-mousemove-400`))],
            [(_) => _.keyDown('A')],
            [(_) => _.sleep(1000)],
            [(_) => _.keyUp('A')],
            [(_) => _.screenshot(to(`after-Left-Presed-1sec`))],
            [(_) => _.sleep(1000)],
            [(_) => _.press('Enter')],
            [(_) => _.sleep(1000)],
            [(_) => _.sendText('/goto 0,0')],
            [(_) => _.press('Enter')],
            [(_) => _.sleep(1000)],
            [(_) => _.screenshot(to(`teleporting-to-genesis`))],
            [(_) => _.loadedClient()],
            [(_) => _.sleep(1000)],
            [(_) => _.screenshot(to(`teleported-to-genesis`))],
            [(_) => _.sleep(1000)],
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
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--remote-debugging-port=8084'] })
    const page = await browser.newPage()
    page.on('console', _ => {
        fs.appendFileSync('./output/console.txt', _._text + '\n')
        if (_._text.toString().includes('WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost')) {
            console.log(`Problem: WebGL context loss`)
            process.exit(1)
        }
    })
    page.setViewport({ width: 1280, height: 720 })

    await page.goto('https://explorer.decentraland.zone/branch/feat/preserveDrawingBuffer/index.html?ENV=org&position=100,100')
    await page.waitForTimeout({ 'waitUntil': 'domcontentloaded' })
    await sleep(1000)
    const name = '0xe81e65c91f439d475054532f4c1f8ce595400a32'
    const script = `
        (function storeInitialData(window) {
            window.localStorage.setItem('dcl-last-session-id', '"${name}"')
            window.localStorage.setItem('dcl-local-profile-org-${name}', JSON.stringify(${JSON.stringify(JSON.parse(fs.readFileSync('./userProfile.json').toString()))}))
            window.localStorage.setItem('dcl-session-${name}',  JSON.stringify(${JSON.stringify(JSON.parse(fs.readFileSync('./userSession.json').toString()))}))
        })(window)`
    await page.evaluate(script)

    await page.waitFor('.eth-login-guest-button')
    await page.click('.eth-login-guest-button')
    await sleep(2000)
    await page.waitForTimeout('#overlay[style*="display"][style*="none"]', { timeout: 2000 })
    await page.screenshot(to(`client-entering`))
    await loadedClient()
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
        loadedClient,
        browser,
    }
    async function loadedClient() {
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
    }
}
