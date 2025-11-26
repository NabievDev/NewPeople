from app.core.database import SessionLocal, engine, Base
from app.models.models import User, Category, PublicTag, InternalTag, AppealStatusConfig
from app.core.security import get_password_hash
from sqlalchemy.orm import Session

def init_database():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if not existing_admin:
            admin = User(
                username="admin",
                email="admin@novielyudi.ru",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)
            print("✓ Admin user created (username: admin, password: admin123)")
        
        existing_moderator = db.query(User).filter(User.username == "moderator").first()
        if not existing_moderator:
            moderator = User(
                username="moderator",
                email="moderator@novielyudi.ru",
                hashed_password=get_password_hash("moderator123"),
                role="moderator"
            )
            db.add(moderator)
            print("✓ Moderator user created (username: moderator, password: moderator123)")
        
        if db.query(Category).count() == 0:
            categories = [
                Category(name="Жилищно-коммунальное хозяйство", order=1),
                Category(name="Транспорт и дороги", order=2),
                Category(name="Образование", order=3),
                Category(name="Здравоохранение", order=4),
                Category(name="Экология", order=5),
                Category(name="Благоустройство", order=6),
                Category(name="Социальная защита", order=7),
                Category(name="Другое", order=8),
            ]
            db.add_all(categories)
            db.flush()
            
            subcategories = [
                Category(name="Ремонт и содержание домов", parent_id=1, order=1),
                Category(name="Теплоснабжение", parent_id=1, order=2),
                Category(name="Водоснабжение", parent_id=1, order=3),
                Category(name="Общественный транспорт", parent_id=2, order=1),
                Category(name="Ремонт дорог", parent_id=2, order=2),
                Category(name="Парковки", parent_id=2, order=3),
            ]
            db.add_all(subcategories)
            print("✓ Categories created")
        
        if db.query(PublicTag).count() == 0:
            public_tags = [
                PublicTag(name="Новое", color="#00C9C8", order=0),
                PublicTag(name="В работе", color="#FFA500", order=1),
                PublicTag(name="Решено", color="#22C55E", order=2),
                PublicTag(name="Отклонено", color="#EF4444", order=3),
            ]
            db.add_all(public_tags)
            print("✓ Public tags created")
        
        if db.query(InternalTag).count() == 0:
            internal_tags = [
                InternalTag(name="Срочно", color="#DC2626", order=0),
                InternalTag(name="Требует проверки", color="#F59E0B", order=1),
                InternalTag(name="Передано в департамент", color="#3B82F6", order=2),
                InternalTag(name="Дубликат", color="#6B7280", order=3),
                InternalTag(name="Важное", color="#8B5CF6", order=4),
            ]
            db.add_all(internal_tags)
            print("✓ Internal tags created")
        
        if db.query(AppealStatusConfig).count() == 0:
            statuses = [
                AppealStatusConfig(
                    status_key="new",
                    name="Новое",
                    color="#3B82F6",
                    description="Обращение только поступило",
                    order=0,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="in_progress",
                    name="В работе",
                    color="#F59E0B",
                    description="Обращение находится в обработке",
                    order=1,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="resolved",
                    name="Решено",
                    color="#10B981",
                    description="Обращение успешно обработано",
                    order=2,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="rejected",
                    name="Отклонено",
                    color="#EF4444",
                    description="Обращение отклонено",
                    order=3,
                    is_system=True
                ),
            ]
            db.add_all(statuses)
            print("✓ Appeal status configs created")
        
        db.commit()
        print("\n✅ Database initialized successfully!")
        print("\nLogin credentials:")
        print("  Admin: username='admin', password='admin123'")
        print("  Moderator: username='moderator', password='moderator123'")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
