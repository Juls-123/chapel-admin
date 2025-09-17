-- Upload History Schema for Chapel Admin System
-- Tracks all file uploads with metadata, errors, and processing status

-- Upload history table to track all file uploads
CREATE TABLE upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_size bigint NOT NULL, -- in bytes
  file_type text NOT NULL, -- 'students', 'attendance', etc.
  mime_type text NOT NULL, -- 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', etc.
  uploaded_by uuid REFERENCES admins(id) NOT NULL,
  upload_status text DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed', 'partial')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  records_total integer DEFAULT 0,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_summary text, -- brief error description
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Upload errors table to track individual record errors
CREATE TABLE upload_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE NOT NULL,
  row_number integer NOT NULL, -- which row in the file had the error
  field_name text, -- which field caused the error (optional)
  error_type text NOT NULL, -- 'validation', 'duplicate', 'missing_data', 'format_error', etc.
  error_message text NOT NULL,
  raw_data jsonb, -- the raw row data that failed
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_upload_history_uploaded_by ON upload_history(uploaded_by);
CREATE INDEX idx_upload_history_file_type ON upload_history(file_type);
CREATE INDEX idx_upload_history_upload_status ON upload_history(upload_status);
CREATE INDEX idx_upload_history_created_at ON upload_history(created_at DESC);
CREATE INDEX idx_upload_errors_upload_id ON upload_errors(upload_id);
CREATE INDEX idx_upload_errors_error_type ON upload_errors(error_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_upload_history_updated_at BEFORE UPDATE ON upload_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
