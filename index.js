
/*
IF YOU GONNA SKID JUST DO IT I DON'T GIVE A FUCK ABOUT YOUR SHIT


   Please do keep in mind that Nodejs is better then Python on discord

   Initialization
   npm install axios discord.js

API ไปเอาที่เว็บนี้ virustotal.com 

*/

const { Client, GatewayIntentBits, Partials, ButtonStyle, TextInputStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const TOKEN = ""
const VIRUSTOTAL_API_KEY = ""

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    const guilds = client.guilds.cache.map(guild => guild.id);
    for (const guildId of guilds) {
        client.application.commands.create({
            name: 'virustotal_menu',
            description: 'Scan a URL with VirusTotal'
        }, guildId);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand() && interaction.commandName === 'virustotal_menu') {
            if (!interaction.member || !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({ content: '> ```คนไม่มีสิทธิ์ใช้คำสั่งนี้ !```', ephemeral: true });
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
        } else if (interaction.isButton() && interaction.customId === 'url_input') {
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
        } else if (interaction.isModalSubmit() && interaction.customId === 'url_modal') {
            const url = interaction.fields.getTextInputValue('url_input_field');

            const sendingEmbed = new EmbedBuilder()
                .setTitle('กำลังดำเนินการ')
                .setDescription('> ```กำลังส่ง...```')
                .setColor(0xFFFF00);

            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({ embeds: [sendingEmbed] });

            try {
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

                const scanId = response.data.scan_id;

                const resultEmbed = new EmbedBuilder()
                    .setTitle('การดำเนินการเสร็จสมบูรณ์')
                    .setDescription('> ```URL ได้รับการสแกนแล้ว โปรดตรวจสอบข้อความส่วนตัวของคุณสำหรับรายละเอียด```')
                    .setColor('#0099ff');

                await interaction.editReply({ embeds: [resultEmbed] });

                const resultResponse = await axios.get(
                    'https://www.virustotal.com/vtapi/v2/url/report',
                    {
                        params: {
                            apikey: process.env.VIRUSTOTAL_API_KEY,
                            resource: scanId
                        }
                    }
                );

                const result = resultResponse.data;

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

                await interaction.user.send({ embeds: [resultDetailsEmbed] });

            } catch (error) {
                console.error('Error during VirusTotal scan:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('เกิดข้อผิดพลาด')
                    .setDescription('มีข้อผิดพลาดในการดำเนินการตามคำขอของคุณ')
                    .setColor(0xFF0000);
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'เกิดข้อผิดพลาดขณะดำเนินการกับการโต้ตอบนี้', ephemeral: true });
        } else {
            await interaction.reply({ content: 'เกิดข้อผิดพลาดขณะดำเนินการกับการโต้ตอบนี้', ephemeral: true });
        }
    }
});

client.login(TOKEN);
