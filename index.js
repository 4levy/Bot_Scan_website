/*
IF YOU GONNA SKID JUST DO IT I DON'T GIVE A FUCK ABOUT YOUR SHIT

   Please do keep in mind that Nodejs is better than Python on discord

   Initialization
   npm install axios discord.js

API ไปเอาที่เว็บนี้ virustotal.com 
*/

const { Client, GatewayIntentBits, Partials, ButtonStyle, TextInputStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const TOKEN = "YOUR_BOT_TOKEN";
const VIRUSTOTAL_API_KEY = "YOUR_VIRUSTOTAL_API_KEY";

client.once('ready', () => {
    logger.info(`Logged in as ${client.user.tag}`);
    const guilds = client.guilds.cache.map(guild => guild.id);
    for (const guildId of guilds) {
        client.application.commands.create({
            name: 'virustotal_menu',
            description: 'Scan a URL with VirusTotal'
        }, guildId).then(() => logger.info(`Command created in guild ${guildId}`));
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand() && interaction.commandName === 'virustotal_menu') {
            await handleMenuCommand(interaction);
        } else if (interaction.isButton() && interaction.customId === 'url_input') {
            await showModal(interaction);
        } else if (interaction.isModalSubmit() && interaction.customId === 'url_modal') {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        handleInteractionError(interaction, 'เกิดข้อผิดพลาดขณะดำเนินการกับการโต้ตอบนี้');
    }
});

async function handleMenuCommand(interaction) {
    if (!interaction.member || !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({ content: '> ```คนไม่มีสิทธิ์ใช้คำสั่งนี้!```', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('Scan URL | VirusTotal')
        .setDescription('> ```คลิกปุ่มด้านล่างเพื่อป้อน URL ที่ต้องการสแกน```')
        .setColor('#f8f5f5');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('url_input')
                .setLabel('ป้อน URL')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function showModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('url_modal')
        .setTitle('สแกน URL')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('url_input_field')
                    .setLabel('ป้อน URL ที่ต้องการ')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
    const url = interaction.fields.getTextInputValue('url_input_field');
    logger.info(`Received URL for scanning: ${url}`);

    const sendingEmbed = new EmbedBuilder()
        .setTitle('กำลังดำเนินการ')
        .setDescription('> ```กำลังส่ง...```')
        .setColor(0xFFFF00);

    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ embeds: [sendingEmbed] });

    try {
        const scanId = await initiateScan(url);

        const resultEmbed = new EmbedBuilder()
            .setTitle('การดำเนินการเสร็จสมบูรณ์')
            .setDescription('> ```URL ได้รับการสแกนแล้ว โปรดตรวจสอบข้อความส่วนตัวของคุณสำหรับรายละเอียด```')
            .setColor('#0099ff');

        await interaction.editReply({ embeds: [resultEmbed] });

        const result = await fetchScanResult(scanId);
        await sendResultToUser(interaction.user, url, result);

    } catch (error) {
        logger.error('Error during VirusTotal scan:', error);
        handleInteractionError(interaction, 'มีข้อผิดพลาดในการดำเนินการตามคำขอของคุณ');
    }
}

async function initiateScan(url) {
    const response = await axios.post(
        'https://www.virustotal.com/vtapi/v2/url/scan',
        {},
        {
            params: {
                apikey: VIRUSTOTAL_API_KEY,
                url: url
            }
        }
    );
    return response.data.scan_id;
}

async function fetchScanResult(scanId) {
    const response = await axios.get(
        'https://www.virustotal.com/vtapi/v2/url/report',
        {
            params: {
                apikey: VIRUSTOTAL_API_KEY,
                resource: scanId
            }
        }
    );
    return response.data;
}

async function sendResultToUser(user, url, result) {
    const fields = [
        { name: 'วันที่สแกน', value: result.scan_date || 'N/A', inline: true },
        { name: 'พบไวรัส', value: `${result.positives} / ${result.total}` || 'N/A', inline: true },
        { name: 'ลิงก์', value: result.permalink || 'N/A' }
    ].filter(field => field.value);

    const resultDetailsEmbed = new EmbedBuilder()
        .setTitle('ผลการสแกน URL ด้วย VirusTotal')
        .setDescription(`ผลการสแกนสำหรับ URL: __${url}__`)
        .addFields(fields)
        .setColor('#f8f5f5');

    await user.send({ embeds: [resultDetailsEmbed] });
}

async function handleInteractionError(interaction, message) {
    const errorEmbed = new EmbedBuilder()
        .setTitle('เกิดข้อผิดพลาด')
        .setDescription(message)
        .setColor(0xFF0000);

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
    } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

client.login(TOKEN);
