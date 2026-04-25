from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, GlobalSetting

router = APIRouter()

class SettingItem(BaseModel):
    key: str
    value: str

class SettingsUpdate(BaseModel):
    settings: list[SettingItem]

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(GlobalSetting).all()
    # Default values if not set
    setting_map = {s.key: s.value for s in settings}
    if "MY_API_KEY" not in setting_map:
        setting_map["MY_API_KEY"] = ""
    if "MODEL_NAME" not in setting_map:
        setting_map["MODEL_NAME"] = "gemini-flash-latest"
    return setting_map

@router.post("/settings")
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    for item in req.settings:
        setting = db.query(GlobalSetting).filter(GlobalSetting.key == item.key).first()
        if setting:
            setting.value = item.value
        else:
            new_setting = GlobalSetting(key=item.key, value=item.value)
            db.add(new_setting)
    db.commit()
    return {"message": "Settings updated"}
