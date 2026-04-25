import json
import os

# Caminho do arquivo de saída gerado pelo MCP
output_file = r'C:\Users\dvisr\.gemini\antigravity\brain\3434a55f-d15e-48af-b0b4-c483a3bb9661\.system_generated\steps\1854\output.txt'

def extract_family_ids(file_path):
    ids = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for doc in data.get('documents', []):
                name = doc.get('name', '')
                if 'familias/' in name:
                    family_id = name.split('familias/')[-1]
                    ids.append(family_id)
    except Exception as e:
        print(f"Erro ao ler arquivo: {e}")
    return ids

family_ids = extract_family_ids(output_file)
print(f"Famílias encontradas: {len(family_ids)}")
print(json.dumps(family_ids))
