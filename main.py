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
import logging

# add log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

intents = nextcord.Intents.default()
bot = commands.Bot(command_prefix='!', intents=intents)

TOKEN = "bot token"
VIRUSTOTAL_API_KEY = "api "

@bot.event
async def on_ready():
    logger.info(f'บอทเข้าสู่ระบบในชื่อ {bot.user}')

class VirusTotalModal(nextcord.ui.Modal):
    def __init__(self):
        super().__init__(title="สแกน URL ด้วย VirusTotal")

        self.url_input = TextInput(
            label="URL ที่ต้องการสแกน",
            placeholder="กรอก URL ที่นี่",
            min_length=5,
            max_length=200,
            required=True
        )
        self.add_item(self.url_input)

    async def callback(self, interaction: Interaction):
        url = self.url_input.value
        logger.info(f"URL ที่ส่งมาสำหรับการสแกน: {url}")

        try:
            await interaction.response.defer(ephemeral=True)
            
            scan_data = self.initiate_scan(url)
            scan_id = scan_data.get('scan_id')
            if not scan_id:
                raise ValueError("การตอบกลับที่ไม่ถูกต้องจาก VirusTotal")

            report_data = self.fetch_report(scan_id)
            if not report_data:
                raise ValueError("ไม่สามารถดึงรายงานการสแกนได้")

            embed = self.create_result_embed(url, report_data)
            await interaction.followup.send(embed=embed, ephemeral=True)
            logger.info(f"การสแกนเสร็จสิ้นสำหรับ: {url}")

        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดระหว่างการสแกน VirusTotal: {e}")
            await interaction.followup.send("เกิดข้อผิดพลาดระหว่างการสแกน โปรดลองอีกครั้งในภายหลัง", ephemeral=True)

    def initiate_scan(self, url):
        response = requests.post(
            'https://www.virustotal.com/vtapi/v2/url/scan',
            params={'apikey': VIRUSTOTAL_API_KEY, 'url': url}
        )
        response.raise_for_status()
        return response.json()

    def fetch_report(self, scan_id):
        response = requests.get(
            'https://www.virustotal.com/vtapi/v2/url/report',
            params={'apikey': VIRUSTOTAL_API_KEY, 'resource': scan_id}
        )
        response.raise_for_status()
        return response.json()

    def create_result_embed(self, url, report_data):
        fields = [
            {"name": "วันที่สแกน", "value": report_data.get("scan_date", "N/A"), "inline": True},
            {"name": "การตรวจพบ", "value": f"{report_data.get('positives', 'N/A')} / {report_data.get('total', 'N/A')}", "inline": True},
            {"name": "ลิงก์ถาวร", "value": report_data.get("permalink", "N/A")}
        ]

        embed = nextcord.Embed(
            title="ผลการสแกน URL ด้วย VirusTotal",
            description=f"ผลการสแกนสำหรับ URL: __{url}__",
            color=0x0099ff
        )

        for field in fields:
            embed.add_field(name=field['name'], value=field['value'], inline=field.get('inline', False))

        return embed

class VirusTotalView(View):
    def __init__(self):
        super().__init__(timeout=None)

    @nextcord.ui.button(label="สแกน URL", style=ButtonStyle.primary)
    async def scan_url(self, button: Button, interaction: Interaction):
        await interaction.response.send_modal(VirusTotalModal())

@bot.slash_command(name="virustotal_menu", description="สแกน URL ด้วย VirusTotal")
async def virustotal_menu(interaction: Interaction):
    embed = nextcord.Embed(
        title="สแกน URL ด้วย VirusTotal",
        description="คลิกปุ่มด้านล่างเพื่อสแกน URL ด้วย VirusTotal.",
        color=0x00ff00
    )
    await interaction.response.send_message(embed=embed, view=VirusTotalView())

if __name__ == "__main__":
    try:
        bot.run(TOKEN)
    except Exception as e:
        logger.error(f"ไม่สามารถเริ่มบอทได้: {e}")
