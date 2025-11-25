from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Category as CategoryModel, User, UserRole
from app.schemas.schemas import Category, CategoryCreate, CategoryUpdate, CategoryTree
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/categories", tags=["categories"])

def build_category_tree(categories: List[CategoryModel], parent_id=None):
    tree = []
    for category in categories:
        if category.parent_id == parent_id:
            category_dict = Category.model_validate(category)
            category_tree = CategoryTree(
                **category_dict.model_dump(),
                subcategories=build_category_tree(categories, category.id)
            )
            tree.append(category_tree)
    return sorted(tree, key=lambda x: x.order)

@router.get("", response_model=List[CategoryTree])
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryModel).all()
    return build_category_tree(categories)

@router.post("", response_model=Category)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db_category = CategoryModel(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.patch("/{category_id}", response_model=Category)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
