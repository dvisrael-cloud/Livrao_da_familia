import json
import glob
import os

base_dir = r'C:\Users\dvisr\.gemini\antigravity\brain\3434a55f-d15e-48af-b0b4-c483a3bb9661\.system_generated\steps'
all_files = glob.glob(os.path.join(base_dir, '*', 'output.txt'))

total_families_with_members = 0
total_members = 0

legacy_links = []
phantom_links = []
missing_roles = []

for file_path in all_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if not data or 'documents' not in data:
            continue
            
        members = data.get('documents', [])
        
        # Filtrar o arquivo que era apenas a coleção "familias" raiz (passo 1854)
        if members and '/familias/' in members[0].get('name', '') and not '/membros/' in members[0].get('name', ''):
            continue
            
        if len(members) > 0:
            total_families_with_members += 1
            total_members += len(members)
        
        # Extrair todos UUIDs ativos nesta família (subcoleção)
        active_uuids = set()
        for m in members:
            docId = m['name'].split('/')[-1]
            active_uuids.add(docId)
            
        for m in members:
            fields = m.get('fields', {})
            docId = m['name'].split('/')[-1]
            familyId = m['name'].split('/familias/')[1].split('/')[0]
            nome = fields.get('nomeCompleto', {}).get('stringValue', '') or fields.get('name', {}).get('stringValue', '') or docId
            
            vinculoId = fields.get('vinculoFamiliarId', {}).get('stringValue', '')
            
            # Buscar papel em papel, parentesco ou map relationshipInfo
            papel = fields.get('papel', {}).get('stringValue', '')
            parentesco = fields.get('parentesco', {}).get('stringValue', '')
            rel_info = fields.get('relationshipInfo', {}).get('mapValue', {}).get('fields', {})
            if not papel:
                papel = rel_info.get('papel', {}).get('stringValue', '')
            if not parentesco:
                parentesco = rel_info.get('parentesco', {}).get('stringValue', '')
                
            pai = fields.get('pai', {}).get('stringValue', '')
            mae = fields.get('mae', {}).get('stringValue', '')
            
            # 1. Membros com vinculoFamiliarId vazio mas com texto em pai/mae/parentesco
            if not vinculoId:
                if pai or mae or parentesco:
                    legacy_links.append({"familyId": familyId, "nome": nome, "pai": pai, "mae": mae, "parentesco": parentesco})
            
            # 2. Vínculos Fantasmas
            if vinculoId and vinculoId not in active_uuids:
                phantom_links.append({"familyId": familyId, "nome": nome, "vinculoId": vinculoId})
                
            # 3. Sem Papel
            if not papel and not parentesco:
                missing_roles.append({"familyId": familyId, "nome": nome})
                
    except Exception as e:
        pass # ignora erros de json parsing em arquivos que possivelmente não são JSONs válidos

report = {
    "estatisticas": {
        "familias_com_membros_ativos": total_families_with_members,
        "total_membros_cadastrados": total_members
    },
    "alertas": {
        "vinculos_legados": len(legacy_links),
        "vinculos_fantasmas": len(phantom_links),
        "sem_papel_definido": len(missing_roles)
    },
    "detalhes": {
        "legados": legacy_links,
        "fantasmas": phantom_links,
        "sem_papel": missing_roles
    }
}

print(json.dumps(report, indent=2))
