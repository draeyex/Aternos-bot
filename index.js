const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const mc = require("minecraft-protocol");
const app = express();

process.on("uncaughtException", (err) => {
  console.log("Caught exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled rejection:", err.message);
});

app.use(express.json());

// Real-time bot data
const botData = {
  online: false,
  coords: { x: 0, y: 0, z: 0 },
  startTime: Date.now(),
};

// Dashboard API — fetched by index.html every 3 seconds
app.get("/status", (req, res) => {
  res.json({
    online: botData.online,
    coords: botData.coords,
    uptime: Math.floor((Date.now() - botData.startTime) / 1000),
  });
});

app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// U CAN ONLY EDIT THIS SECTION!!
const BOT_PASSWORD = "boqad112022";

function createBot() {
  console.log("Attempting to connect to Minecraft server...");
  const bot = mineflayer.createBot({
    host: "force_smp.aternos.me",
    version: false,
    username: "lvnger",
    port: 20039,
  });

  let hasAuthenticated = false;
  let spawnTriggered = false;

  bot.once("spawn", () => {
    if (spawnTriggered) return;
    spawnTriggered = true;
    botData.online = true;
    console.log("Bot spawned successfully!");
    setTimeout(() => {
      if (!hasAuthenticated) {
        bot.chat(`/login ${BOT_PASSWORD}`);
        console.log("Sent login command");
      }
    }, 1000);
  });

  bot.on("respawn", () => {
    console.log("Bot respawned - resuming movement");
    botData.online = true;
    setTimeout(() => {
      startRandomMovement();
    }, 1000);
  });

  // Track real coordinates
  bot.on("move", () => {
    if (bot.entity && bot.entity.position) {
      botData.coords = {
        x: Math.floor(bot.entity.position.x),
        y: Math.floor(bot.entity.position.y),
        z: Math.floor(bot.entity.position.z),
      };
    }
  });

  bot.on("message", (message) => {
    const msg = message.toString().toLowerCase();
    console.log("Server message:", msg);

    if (hasAuthenticated) return;

    if (
      msg.includes("successfully logged in") ||
      msg.includes("logged in successfully") ||
      msg.includes("has logged in")
    ) {
      console.log("Login successful!");
      hasAuthenticated = true;
    } else if (
      msg.includes("wrong password") ||
      msg.includes("incorrect password")
    ) {
      console.log("Wrong password - trying to register instead...");
      bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
    } else if (
      msg.includes("not registered") ||
      msg.includes("please register") ||
      msg.includes("/register")
    ) {
      console.log("Not registered - registering now...");
      bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
      hasAuthenticated = true;
    } else if (
      msg.includes("successfully registered") ||
      msg.includes("registered successfully")
    ) {
      console.log("Registration successful!");
      hasAuthenticated = true;
    } else if (msg.includes("already registered")) {
      console.log("Already registered - logging in...");
      bot.chat(`/login ${BOT_PASSWORD}`);
    }
  });

  /// DONT TOUCH ANYTHING MORE!
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let isMoving = false;
  let movementInterval = null;

  function startRandomMovement() {
    if (movementInterval) return;

    console.log("Starting wood chopping and building...");

    const mcData = require("minecraft-data")(bot.version);
    const defaultMove = new Movements(bot, mcData);
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    defaultMove.allow1by1towers = false;
    defaultMove.allowParkour = true;
    defaultMove.allowFreeMotion = true;
    bot.pathfinder.setMovements(defaultMove);

    movementInterval = setInterval(() => {
      if (!bot.entity || !bot.entity.position) return;

      try {
        // Chop wood
        if (Math.random() > 0.5) {
          const woodBlock = bot.findBlock({
            matching: (block) => block.name.includes("log"),
            maxDistance: 6,
          });
          if (woodBlock) {
            bot.dig(woodBlock).catch(() => {});
            console.log("Chopping wood...");
          }
        }

        // Build with wood
        if (Math.random() > 0.6) {
          const item = bot.inventory
            .items()
            .find((i) => i.name.includes("planks") || i.name.includes("log"));
          if (item) {
            const ref = bot.blockAt(bot.entity.position.offset(1, -1, 0));
            if (ref && ref.name !== "air") {
              bot.equip(item, "hand").then(() => {
                bot.placeBlock(ref, { x: 0, y: 1, z: 0 }).catch(() => {});
              });
              console.log("Building house...");
            }
          }
        }

        // Plant saplings (replant)
        if (Math.random() > 0.7) {
          const sapling = bot.inventory
            .items()
            .find((i) => i.name.includes("sapling"));
          if (sapling) {
            const dirtRef = bot.blockAt(
              bot.entity.position.offset(0, -1, 0),
            );
            if (dirtRef && dirtRef.name !== "air") {
              bot.equip(sapling, "hand").then(() => {
                bot.placeBlock(dirtRef, { x: 0, y: 1, z: 0 }).catch(() => {});
              });
              console.log("Replanting tree...");
            }
          }
        }

        // Look active
        if (Math.random() > 0.5) {
          const entity = bot.nearestEntity();
          if (entity) {
            bot.lookAt(entity.position.offset(0, entity.height, 0));
          }
          if (Math.random() > 0.6) bot.swingArm("right");
        }
      } catch (err) {
        console.log("Activity error:", err.message);
      }
    }, 4000);

    // Join greeting
    bot.on("playerJoined", (player) => {
      if (player.username !== bot.username) {
        setTimeout(() => {
          bot.chat(`hi ${player.username}!`);
        }, 2000);
      }
    });

    // Messages LESS frequently (every 15 minutes)
    const activeMessages = [
      "hi",
      "working hard",
      "building a house",
      "not afk",
      "loving this",
    ];
    setInterval(
      () => {
        if (bot.entity) {
          const msg =
            activeMessages[Math.floor(Math.random() * activeMessages.length)];
          bot.chat(msg);
          console.log("Message sent:", msg);
        }
      },
      15 * 60 * 1000,
    );
  }

  function stopRandomMovement() {
    if (movementInterval) {
      clearInterval(movementInterval);
      movementInterval = null;
      bot.pathfinder.setGoal(null);
      console.log("Stopped random movement");
    }
  }

  bot.once("spawn", () => {
    setTimeout(() => {
      startRandomMovement();

      setInterval(() => {
        if (bot.entity && Math.random() > 0.7) {
          bot.setControlState("jump", true);
          setTimeout(() => bot.setControlState("jump", false), 200);
        }
      }, 2000);

      setInterval(() => {
        if (bot.entity) {
          const yaw = Math.random() * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * Math.PI * 0.5;
          bot.look(yaw, pitch, false);
        }
      }, 1500);
    }, 2000);
  });

  bot.on("death", () => {
    console.log("Bot died, waiting for respawn...");
    stopRandomMovement();
  });

  bot.on("playerCollect", (collector, itemDrop) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory
        .items()
        .find((item) => item.name.includes("sword"));
      if (sword) bot.equip(sword, "hand");
    }, 150);
  });

  bot.on("playerCollect", (collector, itemDrop) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const shield = bot.inventory
        .items()
        .find((item) => item.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand");
    }, 250);
  });

  let guardPos = null;

  function guardArea(pos) {
    guardPos = pos.clone();

    if (!bot.pvp.target) {
      moveToGuardPos();
    }
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    const mcData = require("minecraft-data")(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z),
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) {
      moveToGuardPos();
    }
  });

  bot.on("physicTick", () => {
    if (bot.pvp.target) return;
    if (bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
  });
  bot.on("physicTick", () => {
    if (!guardPos) return;
    const filter = (e) =>
      e.type === "mob" &&
      e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== "Armor Stand";
    const entity = bot.nearestEntity(filter);
    if (entity) {
      bot.pvp.attack(entity);
    }
  });
  bot.on("chat", (username, message) => {
    if (message === "guard") {
      const player = bot.players[username];

      if (player && player.entity) {
        bot.chat("I will!");
        guardArea(player.entity.position);
      }
    }
    if (message === "stop") {
      bot.chat("I will stop!");
      stopGuarding();
    }
  });

  bot.on("kicked", (reason) => {
    console.log("Bot was kicked:", reason);
    botData.online = false;
  });

  bot.on("error", (err) => {
    console.log("Bot error:", err.message);
    botData.online = false;
  });

  bot.on("end", () => {
    console.log("Connection ended. Reconnecting in 5 seconds...");
    botData.online = false;
    setTimeout(createBot, 5000);
  });
}

createBot();
