const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const ramda = require("ramda");
const fs = require("fs");

let bot;
const token = process.env.botToken;

const httpClient = axios.create();
httpClient.defaults.timeout = 5000;

function useNull() {
  return undefined;
}

if (process.env.NODE_ENV === "production") {
  bot = new TelegramBot(token, { polling: true });
  //gubot.setWebHook(process.env.HEROKU_URL + token)
} else {
  bot = new TelegramBot(token, { polling: true });
}
const config = {
  headers: {
    ["X-CMC_PRO_API_KEY"]: process.env.coinMarketCapKey,
  },
};
console.log("Bot server started in the " + process.env.NODE_ENV + " mode");

bot.on("polling_error", (error) => {
  console.log(error.code); // => 'EFATAL'
});
const priceTemplateBittrex = (name, data, btc) =>
  `[BITTREX](https://bittrex.com/Market/Index?MarketName=BTC-VAL) : ${parseFloat(
    data.Last
  ).toFixed(8)} BTC | $${parseFloat(data.Last * btc).toFixed(2)}
*Vol:* ${Math.round(data.Volume)} VAL **|** ${(
    parseFloat(data.Last).toFixed(8) * Math.round(data.Volume)
  ).toFixed(2)} BTC **|** ${Math.round(data.Volume * data.Last * btc)} USD
*Low:* ${parseFloat(data.Low).toFixed(8)} | *High:* ${parseFloat(
    data.High
  ).toFixed(8)}
*24h change:* ${parseFloat(
    Math.round(
      100 *
        Math.abs((data.Last - data.PrevDay) / ((data.Last + data.PrevDay) / 2))
    )
  ).toFixed(2)}% ${
    parseFloat(
      Math.round(
        100 *
          Math.abs(
            (data.Last - data.PrevDay) / ((data.Last + data.PrevDay) / 2)
          )
      )
    ).toFixed(2) >= 0
      ? " ⬆️"
      : " ⬇️"
  }`;

const priceTemplateVCC = (name, data, btc) =>
  `[VCC](https://vcc.exchange/exchange/basic?currency=btc&coin=val) : ${parseFloat(
    data.last
  ).toFixed(8)} BTC | $${parseFloat(data.last * btc).toFixed(2)}
*Vol:* ${Math.round(data.baseVolume)} VAL **|** ${(
    parseFloat(data.last).toFixed(8) * Math.round(data.baseVolume)
  ).toFixed(2)} BTC **|** ${Math.round(data.baseVolume * data.last * btc)} USD
*Low:* ${parseFloat(data.low24hr).toFixed(8)} | *High:* ${parseFloat(
    data.high24hr
  ).toFixed(8)}
*24h change:* ${parseFloat(data.percentChange).toFixed(2)}% ${
    parseFloat(data.percentChange).toFixed(2) >= 0 ? " ⬆️" : " ⬇️"
  }`;

const priceTemplateUpbit = (name, data, btc, coingeckoData) =>
  `[UPbit](https://upbit.com/exchange?code=CRIX.UPBIT.BTC-VAL) : ${parseFloat(
    data.trade_price
  ).toFixed(8)} BTC | $${parseFloat(data.trade_price * btc).toFixed(2)}
*Vol:* ${Math.round(
    data.acc_trade_volume +
      coingeckoData.converted_volume.btc *
        parseFloat(data.trade_price).toFixed(8)
  )} VAL **|** ${(
    parseFloat(data.trade_price).toFixed(8) *
      Math.round(data.acc_trade_volume) +
    coingeckoData.converted_volume.btc
  ).toFixed(2)} BTC **|** ${Math.round(
    data.acc_trade_volume * data.trade_price * btc +
      coingeckoData.converted_volume.usd
  )} USD
*Volume Korea:* ${Math.abs(
    parseFloat(data.trade_price).toFixed(8) *
      Math.round(data.acc_trade_volume) +
      coingeckoData.converted_volume.btc -
      coingeckoData.converted_volume.btc
  ).toFixed(2)} BTC 
*Volume Indonesia:* ${coingeckoData.converted_volume.btc.toFixed(2)} BTC
*Low:* ${parseFloat(data.low_price).toFixed(8)} | *High:* ${parseFloat(
    data.high_price
  ).toFixed(8)}
*24h change:* ${parseFloat(data.signed_change_rate * 100).toFixed(2)}% ${
    parseFloat(data.signed_change_rate * 100).toFixed(2) >= 0 ? " ⬆️" : " ⬇️"
  }`;

const priceTemplateFinexbox = (name, data, btc) =>
  `[FINEXBOX](https://www.finexbox.com/market/pair/VAL-BTC.html) : ${parseFloat(
    data.price
  ).toFixed(8)} BTC | $${parseFloat(data.price * btc).toFixed(2)}
*Vol:* ${Math.round(data.volume)} VAL **|** ${(
    parseFloat(data.price).toFixed(8) * Math.round(data.volume)
  ).toFixed(2)} BTC **|** ${Math.round(data.volume * data.price * btc)} USD
*Low:* ${parseFloat(data.low).toFixed(8)} | *High:* ${parseFloat(
    data.high
  ).toFixed(8)}
*24h change:* N/A`;

const priceTemplateLiveCoin = (name, data, btc) =>
  `[Livecoin](https://www.livecoin.net/en/trading/VAL_BTC) : ${parseFloat(
    data.last
  ).toFixed(8)} BTC | $${parseFloat(data.last * btc.last).toFixed(2)}
*Vol:* ${Math.round(data.volume)} VAL **|** ${(
    parseFloat(data.last).toFixed(8) * Math.round(data.volume)
  ).toFixed(2)} BTC **|** ${Math.round(data.volume * data.last * btc.last)} USD
*Low:* ${parseFloat(data.low).toFixed(8)} | *High:* ${parseFloat(
    data.high
  ).toFixed(8)}
*24h change:* N/A`;

bot.on("message", (msg) => {
  if (!msg.text.startsWith("/")) {
    const data = "NEWDATASTART\n" + msg.text + "\nNEWDATAEND\n";
    fs.appendFile("spam.txt", data, (err) => {
      // In case of a error throw err.
      if (err) console.log(err);
    });
  }
  console.log(
    `\x1b[36m Requested by: \x1b[0m${msg.from.id}, \x1b[36m Alias: \x1b[0m${
      msg.from.username
    } ${
      msg.chat.type === "supergroup"
        ? `\x1b[36m Group: \x1b[0m${msg.chat.title}`
        : `\x1b[36m Private: \x1b[0m${msg.chat.username}`
    }
      \x1b[36m Msg Txt: \x1b[0m${msg.text},
      \x1b[36m Timestamp: \x1b[0m${new Date(msg.date * 1000).toUTCString()}),`
  );
});
bot.onText(/\/ping/, (msg) => {
  if (new Date(new Date().toUTCString()) - new Date(msg.date * 1000) < 10000)
    bot.sendMessage(msg.chat.id, "pong");
});
bot.onText(/\/help/, (msg) => {
  if (new Date(new Date().toUTCString()) - new Date(msg.date * 1000) < 10000)
    bot.sendMessage(
      msg.chat.id,
      `
/price - To see the VAL price across different exchanges
/mcap  - To see the VAL market capitalization`,
      { parse_mode: "Markdown" }
    );
});
bot.onText(/\/repo/, (msg) => {
  if (new Date(new Date().toUTCString()) - new Date(msg.date * 1000) < 10000)
    bot.sendMessage(
      msg.chat.id,
      "[GitHub](https://github.com/nishad10/telegramBot)",
      { parse_mode: "Markdown" }
    );
});
bot.onText(/\/mcap/, (msg, a) => {
  axios
    .all([
      httpClient.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=VAL",
        config
      ),
      httpClient.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC",
        config
      ),
    ])
    .then(
      axios.spread((mcap, btc) => {
        bot.sendMessage(
          msg.chat.id,
          `$${Math.round(
            mcap.data.data.VAL.quote.USD.market_cap
          ).toLocaleString()} | ${parseFloat(
            mcap.data.data.VAL.quote.USD.market_cap /
              btc.data.data.BTC.quote.USD.price
          ).toFixed(2)} BTC`,
          { parse_mode: "Markdown" }
        );
      })
    )
    .catch((error) => console.log(error));
});

let vccBTC = 0;
let vccData = 0;
let bittrexData = 0;
let bittrexBTC = 0;
let upbitBTC = 0;
let upbitData = 0;
let fineboxData = 0;
let coinMarketCapBTC = 0;
bot.onText(/\/price/, (msg) => {
  const save = msg;
  if (new Date(new Date().toUTCString()) - new Date(msg.date * 1000) < 10000)
    axios
      .all([
        httpClient
          .get(
            "https://api.bittrex.com/api/v1.1/public/getmarketsummary?market=btc-val"
          )
          .catch(useNull), //bittrex with param
        httpClient
          .get(
            "https://api.bittrex.com/api/v1.1/public/getmarketsummary?market=USD-BTC"
          )
          .catch(useNull),
        // httpClient.get(`https://vcc.exchange/api/v2/summary`).catch(useNull), // vcc without param
        httpClient
          .get(
            "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC",
            config
          )
          .catch(useNull), // This is the BTC USD Price for converting finexbox VAL/BTC price to USD. !!! Will have small discrepancy as not getting the BTC/USD price from finexbox directly'
        /*httpClient
          .get(
            'https://api.livecoin.net//exchange/ticker?currencyPair=VAL/BTC'
          )
          .catch(useNull), // Livecoin
        httpClient
          .get('https://api.livecoin.net//exchange/ticker?currencyPair=BTC/USD')
          .catch(useNull), // LivecoinBTC
          */
        httpClient
          .get("https://api.upbit.com/v1/ticker?markets=BTC-VAL")
          .catch(useNull), //upbit with param
        httpClient
          .get("https://api.upbit.com/v1/ticker?markets=USDT-BTC")
          .catch(useNull), //upbit with param
        httpClient
          .get("https://api.coingecko.com/api/v3/coins/radium")
          .catch(useNull), //coingecko
      ])
      .then(
        axios.spread(
          (
            bittrex,
            bittrexBTCData,
            // vcc,
            coinMarketCapBTCData,
            upbit,
            upbitBTCData,
            coingecko
          ) => {
            let coingeckoData = {};
            try {
              coingeckoData = ramda.find(
                ramda.propEq(
                  "trade_url",
                  "https://id.upbit.com/exchange?code=CRIX.UPBIT.BTC-RADS"
                )
              )(coingecko.data.tickers);
            } catch (exception) {
              console.log(exception);
            }
            if (!ramda.isNil(bittrex) && !ramda.isNil(bittrexBTCData)) {
              bittrexData = bittrex.data.success ? bittrex.data.result[0] : {};
              bittrexBTC = bittrexBTCData.data.success
                ? bittrexBTCData.data.result[0].Last
                : 0;
            }
            /*   if (!ramda.isNil(vcc)) {
                 vccData = ramda.isNil(ramda.prop('val_btc', vcc.data.data))
                   ? {}
                   : ramda.prop('val_btc', vcc.data.data);
                 vccBTC = ramda.isNil(ramda.prop('btc_usdt', vcc.data.data))
                   ? 0
                   : ramda.prop('btc_usdt', vcc.data.data).last;
               }
               
                           if (
                 !ramda.isNil(livecoin) &&
                 livecoin.status == 200 &&
                 !ramda.isNil(livecoinBTC)
               ) {
                 livecoinData = livecoin.data;
                 livecoinBTCdata = livecoinBTC.data;
               }
   
               */
            if (!ramda.isNil(upbit) && !ramda.isNil(upbitBTCData)) {
              upbitData = upbit.data[0];
              upbitBTC = upbitBTCData.data[0].trade_price;
            }
            // Not listed on finebox.
            /*if (!ramda.isNil(finebox) && !ramda.isNil(coinMarketCapBTCData)) {
              fineboxID = ramda.findIndex(ramda.propEq('market', 'VAL_BTC'))(
                finebox.data.result
              )
              fineboxData = ramda.isNil(finebox.data.result[fineboxID])
                ? {}
                : finebox.data.result[fineboxID]
              coinMarketCapBTC =
                coinMarketCapBTCData.data.data.BTC.quote.USD.price
            }*/

            // VCC

            /*
                        \n${
              !ramda.isNil(vcc)
                ? priceTemplateVCC('VCC', vccData, vccBTC)
                : '[VCC](https://vcc.exchange/exchange/basic?currency=btc&coin=val) servers are down.'
              }

                          \n${
              !ramda.isNil(livecoin) &&
                livecoin.status == 200 &&
                !ramda.isNil(livecoinBTCdata)
                ? priceTemplateLiveCoin(
                  'Livecoin',
                  livecoinData,
                  livecoinBTCdata
                )
                : '[Livecoin](https://www.livecoin.net/en/trading/VAL_BTC) servers are down.'
              }
              */

            bot.sendMessage(
              msg.chat.id,
              `${
                !ramda.isNil(bittrex)
                  ? priceTemplateBittrex("Bittrex", bittrexData, bittrexBTC)
                  : "[BITTREX](https://bittrex.com/Market/Index?MarketName=BTC-VAL) servers are down."
              }
             \n${
               !ramda.isNil(upbit)
                 ? priceTemplateUpbit(
                     "Upbit",
                     upbitData,
                     upbitBTC,
                     coingeckoData
                   )
                 : "[UPbit](https://upbit.com/exchange?code=CRIX.UPBIT.BTC-VAL) Servers are down."
             }
              `,
              { parse_mode: "Markdown", disable_web_page_preview: true }
            );
          }
        )
      )
      .catch((error) => {
        console.log(error);
        bot.sendMessage(
          save.chat.id,
          `Looks like something went wrong, try again after some time, this should not happen.`,
          { parse_mode: "Markdown", disable_web_page_preview: true }
        );
      });
});

module.exports = bot;

/*
            httpClient.get('https://xapi.finexbox.com/v1/market').catch(useNull), // finebox without param
            \n${
              !ramda.isNil(finebox)
                ? priceTemplateFinexbox(
                    'Finexbox',
                    fineboxData,
                    coinMarketCapBTC
                  )
                : '[FINEXBOX](https://www.finexbox.com/market/pair/VAL-BTC.html) Servers are down!'
            }

                      httpClient
          .get('https://api.upbit.com/v1/ticker?markets=BTC-VAL')
          .catch(useNull), //upbit with param
        httpClient
          .get('https://api.upbit.com/v1/ticker?markets=USDT-BTC')
          .catch(useNull), //upbit with param
*/
