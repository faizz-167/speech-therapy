"""add auth and plan cols

Revision ID: 001
Revises: 
Create Date: 2026-03-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Therapist table additions
    op.add_column('therapist', sa.Column('password_hash', sa.Text(), nullable=True))
    op.add_column('therapist', sa.Column('role', sa.Text(), server_default='therapist', nullable=False))
    op.add_column('therapist', sa.Column('years_of_experience', sa.Integer(), nullable=True))

    # Patient table additions
    op.add_column('patient', sa.Column('password_hash', sa.Text(), nullable=True))
    op.add_column('patient', sa.Column('role', sa.Text(), server_default='patient', nullable=False))
    op.add_column('patient', sa.Column('clinical_notes', sa.Text(), nullable=True))

    # Plan_task_assignment table additions
    op.add_column('plan_task_assignment', sa.Column('day_index', sa.Integer(), server_default='1', nullable=False))


def downgrade() -> None:
    op.drop_column('plan_task_assignment', 'day_index')
    
    op.drop_column('patient', 'clinical_notes')
    op.drop_column('patient', 'role')
    op.drop_column('patient', 'password_hash')
    
    op.drop_column('therapist', 'years_of_experience')
    op.drop_column('therapist', 'role')
    op.drop_column('therapist', 'password_hash')
