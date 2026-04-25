import json

output_file = r'C:\Users\dvisr\.gemini\antigravity\brain\3434a55f-d15e-48af-b0b4-c483a3bb9661\.system_generated\steps\1869\output.txt'

def perform_audit(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        members = data.get('documents', [])
        total = len(members)
        
        legacy_links = []
        phantom_links = []
        missing_roles = []
        
        active_uuids = set()
        for m in members:
            docId = m['name'].split('/')[-1]
            active_uuids.add(docId)
            
        for m in members:
            fields = m.get('fields', {})
            docId = m['name'].split('/')[-1]
            nome = fields.get('nomeCompleto', {}).get('stringValue', '') or fields.get('name', {}).get('stringValue', '') or docId
            
            vinculoId = fields.get('vinculoFamiliarId', {}).get('stringValue', '')
            papel = fields.get('papel', {}).get('stringValue', '')
            parentesco = fields.get('parentesco', {}).get('stringValue', '')
            
            # 1. Membros com vinculoFamiliarId vazio mas com texto em pai/mae/parentesco
            pai = fields.get('pai', {}).get('stringValue', '')
            mae = fields.get('mae', {}).get('stringValue', '')
            
            if not vinculoId:
                if pai or mae or parentesco:
                    legacy_links.append({"nome": nome, "pai": pai, "mae": mae, "parentesco": parentesco})
            
            # 2. Vínculos Fantasmas
            if vinculoId and vinculoId not in active_uuids:
                phantom_links.append({"nome": nome, "vinculoId": vinculoId})
                
            # 3. Sem Papel
            if not papel and not parentesco:
                missing_roles.append(nome)
                
        return {
            "total": total,
            "legacy": legacy_links,
            "phantom": phantom_links,
            "missing_roles": missing_roles
        }
    except Exception as e:
        return {"error": str(e)}

report = perform_audit(output_file)
print(json.dumps(report, indent=2))
