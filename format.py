import os
import json
import re
from datetime import datetime

# OEM dosyalarının olduğu dizin
oem_dir = 'static/oem_files'  # Dosyalarınızın olduğu dizin
json_output_path = 'processed_telemetry.json'  # Çıkış JSON dosyası

# Tarih formatları ayarlama
def format_epoch(epoch_str):
    """Convert OEM date format to ISO 8601 format."""
    try:
        return datetime.strptime(epoch_str, "%Y-%m-%dT%H:%M:%S.%f").isoformat() + "Z"
    except ValueError:
        return epoch_str  # Hata durumunda orijinal değeri döndür

# OEM dosyasındaki ilgili veriyi parse eden işlev
def parse_oem_file(filepath):
    """Parse an OEM file and return a list of telemetry data between META_STOP and COVARIANCE_START."""
    telemetry_data = []
    with open(filepath, 'r') as file:
        is_reading = False  # META_STOP ve COVARIANCE_START arasında okuma işlemini kontrol etmek için
        for line in file:
            if "META_STOP" in line:
                is_reading = True
                continue
            elif "COVARIANCE_START" in line:
                break
            elif is_reading:
                # Konum ve tarih formatını parse et
                match = re.match(r"(\S+)\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)", line)
                if match:
                    epoch = format_epoch(match.group(1))
                    position = [float(match.group(2)), float(match.group(3)), float(match.group(4))]
                    telemetry_data.append({"epoch": epoch, "position": position})
    return telemetry_data

# OEM dosyalarının parse edilmesi ve JSON dosyasına yazılması
all_telemetry_data = []
for filename in os.listdir(oem_dir):
    if filename.endswith(".oem"):
        filepath = os.path.join(oem_dir, filename)
        telemetry_data = parse_oem_file(filepath)
        all_telemetry_data.extend(telemetry_data)

# JSON dosyasına yaz
with open(json_output_path, 'w') as json_file:
    json.dump(all_telemetry_data, json_file, indent=2)

print(f"JSON dosyası '{json_output_path}' olarak kaydedildi.")
