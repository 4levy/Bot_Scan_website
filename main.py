
"""
IF YOU GONNA SKID JUST DO IT I DON'T GIVE A FUCK ABOUT YOUR SHIT

   Please do keep in mind that Nodejs is better then Python 

   Initialization
   pip install nextcord

API ไปเอาที่เว็บนี้ virustotal.com 
"""

import nextcord
from nextcord.ext import commands
from nextcord import Interaction, ButtonStyle
from nextcord.ui import View, Button, TextInput

import requests

intents = nextcord.Intents.default()
bot = commands.Bot(command_prefix='!', intents=intents)

TOKEN = "bot token"
VIRUSTOTAL_API_KEY = " api"

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}!')

class VirusTotalModal(nextcord.ui.Modal):
    def __init__(self):
        super().__init__(title="Scan URL")

        self.url_input = TextInput(
            placeholder="ป้อน URL ที่ต้องการ",
            label="URL Input",
            min_length=1,
            max_length=200,
            required=True
        )
        self.add_item(self.url_input)

    async def callback(self, interaction: Interaction):
        url = self.url_input.value

        try:
            sending_embed = nextcord.Embed(
                title="กำลังดำเนินการ",
                description="> ```กำลังส่ง...```",
                color=0xFFFF00
            )
            message = await interaction.response.send_message(embed=sending_embed, ephemeral=True)

            scan_response = requests.post(
                'https://www.virustotal.com/vtapi/v2/url/scan',
                params={'apikey': VIRUSTOTAL_API_KEY, 'url': url}
            )

            if scan_response.status_code == 200:
                scan_data = scan_response.json()
                scan_id = scan_data.get('scan_id')

                result_embed = nextcord.Embed(
                    title="การดำเนินการเสร็จสมบูรณ์",
                    description="> ```URL ได้รับการสแกนแล้ว โปรดตรวจสอบข้อความส่วนตัวของคุณสำหรับรายละเอียด```",
                    color=0x0099ff
                )
                await message.edit(embed=result_embed)

                # Fetch scan report
                report_response = requests.get(
                    'https://www.virustotal.com/vtapi/v2/url/report',
                    params={'apikey': VIRUSTOTAL_API_KEY, 'resource': scan_id}
                )

                if report_response.status_code == 200:
                    report_data = report_response.json()

                    fields = [
                        {"name": "วันที่สแกน", "value": report_data.get("scan_date", "N/A"), "inline": True},
                        {"name": "พบไวรัส", "value": f"{report_data.get('positives', 'N/A')} / {report_data.get('total', 'N/A')}", "inline": True},
                        {"name": "ลิงก์", "value": report_data.get("permalink", "N/A")}
                    ]

                    result_details_embed = nextcord.Embed(
                        title="ผลการสแกน URL ด้วย VirusTotal",
                        description=f"ผลการสแกนสำหรับ URL: __${url}__",
                        color=0xf8f5f5
                    )

                    for field in fields:
                        if 'inline' in field: 
                            result_details_embed.add_field(name=field['name'], value=field['value'], inline=field['inline'])
                        else:
                            result_details_embed.add_field(name=field['name'], value=field['value'])

                    await interaction.user.send(embed=result_details_embed)

                else:
                    await interaction.response.send_message("Failed to fetch scan report", ephemeral=True)

            else:
                await interaction.response.send_message("Failed to initiate scan", ephemeral=True)

        except Exception as e:
            print('Error during VirusTotal scan:', e)
            await interaction.response.send_message("> ```An error occurred during the scan```", ephemeral=True)

class VirusTotalView(View):
    def __init__(self):
        super().__init__()

    @nextcord.ui.button(label="Scan URL", style=ButtonStyle.primary)
    async def button_callback(self, button: Button, interaction: Interaction):
        await interaction.response.send_modal(VirusTotalModal())

@bot.slash_command(name="virustotal_menu", description="Scan URL with VirusTotal")
async def virustotal_menu(interaction: Interaction):
    embed = nextcord.Embed(
        title="Scan URL | VirusTotal",
        description="> ```Click the button below to enter the URL you want to scan```",
        color=0xf8f5f5
    )
    await interaction.response.send_message(embed=embed, view=VirusTotalView())

bot.run(TOKEN)
