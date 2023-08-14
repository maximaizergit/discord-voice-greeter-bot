import { Client, GatewayIntentBits, Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import { joinVoiceChannel } from "@discordjs/voice";
import {
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  StreamType,
} from "@discordjs/voice";
import {
  addUserToWhitelist,
  connectToDatabase,
  removeUserFromWhitelist,
  isUserWhitelisted,
} from "./mongodb.js";

import fs from "fs";
import path from "path";
import url from "url";
import fetch from "node-fetch";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import googleTTS from "google-tts-api";
import tts from "discord-tts";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "GuildVoiceStates"],
});
const TOKEN =
  "MTE0MDM2MTI3NjEyMDM4MzU2OA.GAKa_V.ds0edaYpbmYmkI8o4Pql4jFoqSg9qi-z0Rz_aI";
const CLIENT_ID = "1140361276120383568";
const GUILD_ID = "598932217246384129";
client.login(TOKEN);

const rest = new REST({ version: "10" }).setToken(TOKEN);
client.on("ready", () => {
  console.log(`${client.user.tag} has logged in!`);
  connectToDatabase();
  listVoiceChannels();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options } = interaction;
  try {
    if (interaction.commandName === "hui") {
      await interaction.reply("соси");
    } else if (interaction.commandName === "addtowl") {
      const userOption = options.getUser("user"); // Get the selected user
      if (userOption) {
        const userId = userOption.id; // Extract user's ID
        addUserToWhitelist(userId);
        await interaction.reply(
          `Added user with ID ${userId} to the whitelist.`
        );
      } else {
        await interaction.reply("User not found.");
      }
    } else if (interaction.commandName === "removefromwl") {
      const userOption = options.getUser("user"); // Get the selected user
      if (userOption) {
        const userId = userOption.id; // Extract user's ID
        removeUserFromWhitelist(userId);
        await interaction.reply(
          `Removed user with ID ${userId} from the whitelist.`
        );
      } else {
        await interaction.reply("User not found.");
      }
    }
  } catch (err) {
    await interaction.reply(err);
  }
});

async function main() {
  const commands = [
    {
      name: "hui",
      description: "просто хуй",
    },
    {
      name: "addtowl",
      description: "Добавить пользователя в whitelist",
      options: [
        {
          name: "user",
          description: "Выберите пользователя",
          type: 6, // User option type
          required: true,
        },
      ],
    },
    {
      name: "removefromwl",
      description: "Удалить пользователя из whitelist",
      options: [
        {
          name: "user",
          description: "Выберите пользователя",
          type: 6, // User option type
          required: true,
        },
      ],
    },
  ];
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
    client.login(TOKEN);
  } catch (err) {
    console.log(err);
  }
}

async function listVoiceChannels() {
  try {
    // Получаем объект гильдии (сервера)
    const guild = await client.guilds.fetch(GUILD_ID);

    // Получаем список голосовых каналов
    const channels = await guild.channels.fetch();

    console.log(`Voice channels in the guild:`);
    channels.forEach((channel) => {
      if (channel.type == "2") {
        console.log(`- ${channel.name} (ID: ${channel.id})`);
      }
    });
  } catch (err) {
    console.log("ups " + err);
  }
}

async function generateTTSFile(text, lang) {
  const filePath = path.join(__dirname, "tts.mp3"); // Путь для сохранения аудио файла
  const url = googleTTS.getAudioUrl(text, {
    lang: lang || "en",
    slow: false,
    host: "https://translate.google.com",
  });

  const response = await fetch(url);
  const buffer = await response.buffer();

  fs.writeFileSync(filePath, buffer);
  console.log("TTS file generated:", filePath);
}

async function joinVoiceChannelById(cId, username) {
  try {
    // Получаем объект голосового канала по указанному ID
    const voiceChannel = await client.channels.fetch(cId);
    const guild = await client.guilds.fetch(GUILD_ID);
    if (voiceChannel && voiceChannel.type == "2") {
      const connection = joinVoiceChannel({
        channelId: cId,
        guildId: GUILD_ID,
        adapterCreator: guild.voiceAdapterCreator,
      });
      // Создаем аудио-плеер и аудио-ресурс
      const audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });

      // Создаем TTS аудио файл параллельно
      await generateTTSFile(`Привет ${username}`, "ru");

      // Когда TTS аудио файл готов, воспроизводим его
      const ttsFilePath = path.join(__dirname, "tts.mp3");
      const ttsAudioResource = createAudioResource(ttsFilePath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      ttsAudioResource.volume.setVolume(3); // Значение от 0 до 1
      await new Promise((resolve) => setTimeout(resolve, 300));
      audioPlayer.play(ttsAudioResource);
      connection.subscribe(audioPlayer);

      ttsAudioResource.playStream.once("end", async () => {
        // Дождитесь завершения воспроизведения TTS перед воспроизведением lox.mp3
        await new Promise((resolve) => setTimeout(resolve, 100)); // Небольшая пауза (в миллисекундах)

        const musicAudioResource = createAudioResource("lox.mp3");
        audioPlayer.play(musicAudioResource);

        // Когда lox.mp3 закончится, отключаем бота от канала
        musicAudioResource.playStream.once("end", () => {
          connection.destroy();
          console.log("Bot disconnected from voice channel.");
        });
      });
      console.log("Bot joined and started playing audio.");
    } else {
      console.log("Voice channel not found.");
      return null;
    }
  } catch (err) {
    console.log("Error joining voice channel:", err);
    return null;
  }
}

client.on("voiceStateUpdate", async (oldState, newState) => {
  // Check if the user is not a bot and just joined a voice channel
  if (!newState.member.user.bot && newState.channelId) {
    const userId = newState.member.user.id;
    const member = newState.member;
    const username = member.nickname || member.user.username; // Используем никнейм на сервере, если есть

    // Check if the user's ID is in the whitelist
    if (!(await isUserWhitelisted(userId))) {
      // Join the voice channel by its ID
      await joinVoiceChannelById(newState.channelId, username); // Передаем имя пользователя
    }
  }
});

main();
