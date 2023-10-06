const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const fs = require("fs");

const PRODUCTS = "products.txt";

function addProduct(name) {
  if (name.length > 50) {
    throw ["NameMaxLimit", [name.length - 50]];
  }

  fs.appendFile(PRODUCTS, `${name}\n`, function (error) {
    if (error) throw error;
  });
}

function getProductsList() {
  const list = fs.readFileSync(PRODUCTS, "utf8");

  if (list.length === 0) {
    return "Список пуст.";
  }

  let i = 0;
  const numerated = list
    .split("\n")
    .map((name) => {
      if (name === "") return;

      i += 1;
      return `${i}. ${name}`;
    })
    .filter((line) => line);

  return numerated.join("\n");
}

function removeAllProducts() {
  fs.writeFile(PRODUCTS, "", "utf-8", function (error) {
    if (error) throw error;
  });
}

function removeCustomProducts(nums) {
  const file = fs.readFileSync(PRODUCTS, "utf8");
  const list = file.split("\n");

  const notFoundedNums = [];
  nums.forEach((num) => {
    if (num <= 0 || num > list.length) {
      notFoundedNums.push(num);
    }
  });

  if (notFoundedNums.length > 0) {
    throw ["OutOfRange", notFoundedNums];
  }

  const filteredList = list.filter((line, i) => {
    if (!nums.map((n) => parseInt(n)).includes(i + 1)) {
      return line;
    }
  });

  fs.writeFile(PRODUCTS, filteredList.join("\n"), "utf-8", function (error) {
    if (error) throw error;
  });
}

const bot = new Telegraf(process.env.BOT_TOKEN);
let ask = false;

bot.command("list", async (ctx) => {
  const list = getProductsList();
  await ctx.reply(list);
});

bot.command("remove", async (ctx) => {
  ask = true;
  ctx.reply("Введите номера товаров для удаления");
});

bot.command("clean", async (ctx) => {
  removeAllProducts();
  await ctx.reply("Список очищен");
});

bot.on(message("text"), async (ctx) => {
  if (ask) {
    ask = false;

    const nums = ctx.message.text.split(" ");

    try {
      nums.forEach((num) => {
        if (typeof parseInt(num) !== "number") {
          throw ["NaN", num];
        }
      });
    } catch (error) {
      const message = `Можно вводить номера товаров через пробел. Пример: 1 2 3.`;
      await ctx.reply(message);
      return;
    }

    try {
      removeCustomProducts(nums);
    } catch (error) {
      const notFoundedNums = error[1];
      const message =
        notFoundedNums.length === 1
          ? `Товара с номером ${notFoundedNums[0]} не существует`
          : `Товаров со следующими номерами не найдено: ${notFoundedNums.join(
              ", "
            )}`;
      await ctx.reply(message);
      return;
    }
  } else {
    try {
      addProduct(ctx.message.text);
      await ctx.reply("Добавлено");
    } catch (error) {
      const overLimit = error[1];
      const message = `Не более 50 символов. Превысили на ${overLimit}.`;
      await ctx.reply(message);
      return;
    }
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
