const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 固定メッセージを保持する辞書 {guildId: message}
const pinnedMessages = {};

// スラッシュコマンドの登録
const commands = [
    {
        name: "timeout",
        description: "指定ユーザーを一時的にミュート",
        options: [
            { name: "user", type: 6, description: "対象ユーザー", required: true },
            { name: "seconds", type: 4, description: "タイムアウト時間(秒)", required: true }
        ]
    },
    {
        name: "kick",
        description: "指定ユーザーをキック",
        options: [{ name: "user", type: 6, description: "対象ユーザー", required: true }]
    },
    {
        name: "ban",
        description: "指定ユーザーをBAN",
        options: [{ name: "user", type: 6, description: "対象ユーザー", required: true }]
    },
    {
        name: "clearchat",
        description: "指定した数のメッセージを削除",
        options: [{ name: "count", type: 4, description: "削除するメッセージ数", required: true }]
    },
    {
        name: "serverinfo",
        description: "サーバー情報を表示"
    },
    {
        name: "userinfo",
        description: "ユーザー情報を表示",
        options: [{ name: "user", type: 6, description: "対象ユーザー", required: true }]
    },
    {
        name: "omikuji",
        description: "おみくじを引く"
    },
    {
        name: "kotei",
        description: "ユーザーが発言すると固定メッセージを送信",
        options: [{ name: "message", type: 3, description: "固定するメッセージ", required: true }]
    },
    {
        name: "koteikaizyo",
        description: "固定メッセージを解除"
    }
];

client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // スラッシュコマンドを登録
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log("📡 Registering slash commands...");
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
});

// コマンド処理
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === "timeout") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: "権限がありません。", ephemeral: true });
        }
        const user = options.getMember("user");
        const seconds = options.getInteger("seconds");
        await user.timeout(seconds * 1000);
        return interaction.reply(`${user} を ${seconds} 秒間タイムアウトしました。`);
    }

    if (commandName === "kick") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "権限がありません。", ephemeral: true });
        }
        const user = options.getMember("user");
        await user.kick();
        return interaction.reply(`${user} をキックしました。`);
    }

    if (commandName === "ban") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: "権限がありません。", ephemeral: true });
        }
        const user = options.getMember("user");
        await user.ban();
        return interaction.reply(`${user} をBANしました。`);
    }

    if (commandName === "clearchat") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "権限がありません。", ephemeral: true });
        }
        const count = options.getInteger("count");
        await interaction.channel.bulkDelete(count);
        return interaction.reply({ content: `${count} 件のメッセージを削除しました。`, ephemeral: true });
    }

    if (commandName === "serverinfo") {
        const guild = interaction.guild;
        return interaction.reply(`サーバー名: ${guild.name}\nメンバー数: ${guild.memberCount}\nオーナー: ${guild.owner}`);
    }

    if (commandName === "userinfo") {
        const user = options.getMember("user");
        return interaction.reply(`ユーザー名: ${user.user.username}\nユーザーID: ${user.id}\nアカウント作成日: ${user.user.createdAt}`);
    }

    if (commandName === "omikuji") {
        const results = ["大吉", "中吉", "小吉", "吉", "凶", "大凶"];
        const result = results[Math.floor(Math.random() * results.length)];
        return interaction.reply(`おみくじの結果: ${result}`);
    }

    if (commandName === "kotei") {
        pinnedMessages[interaction.guildId] = options.getString("message");
        return interaction.reply({ content: `固定メッセージを設定しました: ${pinnedMessages[interaction.guildId]}`, ephemeral: true });
    }

    if (commandName === "koteikaizyo") {
        if (pinnedMessages[interaction.guildId]) {
            delete pinnedMessages[interaction.guildId];
            return interaction.reply({ content: "固定メッセージを解除しました。", ephemeral: true });
        }
        return interaction.reply({ content: "現在、固定メッセージは設定されていません。", ephemeral: true });
    }
});

// ユーザーが発言すると固定メッセージを送信
client.on("messageCreate", message => {
    if (message.author.bot) return;
    if (pinnedMessages[message.guildId]) {
        message.channel.send(pinnedMessages[message.guildId]);
    }
});

// BOTを起動
client.login(process.env.TOKEN);
