-- Schema Update v2: Enhanced Upload Tracking
-- This script modifies the existing schema to properly track uploads

-- Add upload_batch_id to students table to track which upload batch they came from
ALTER TABLE students 
ADD COLUMN upload_batch_id UUID REFERENCES upload_history(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_upload_batch_id ON students(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_status ON upload_history(status);
CREATE INDEX IF NOT EXISTS idx_upload_history_created_at ON upload_history(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_errors_upload_id ON upload_errors(upload_id);

-- Add trigger to automatically update upload_history statistics
CREATE OR REPLACE FUNCTION update_upload_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update records_processed count
    UPDATE upload_history 
    SET records_processed = (
        SELECT COUNT(*) 
        FROM students 
        WHERE upload_batch_id = NEW.upload_batch_id
    )
    WHERE id = NEW.upload_batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when students are inserted with upload_batch_id
CREATE TRIGGER trigger_update_upload_stats
    AFTER INSERT ON students
    FOR EACH ROW
    WHEN (NEW.upload_batch_id IS NOT NULL)
    EXECUTE FUNCTION update_upload_statistics();

-- Add function to finalize upload batch
CREATE OR REPLACE FUNCTION finalize_upload_batch(batch_id UUID)
RETURNS void AS $$
DECLARE
    total_records INTEGER;
    processed_records INTEGER;
    error_count INTEGER;
BEGIN
    -- Get counts
    SELECT records_total INTO total_records 
    FROM upload_history WHERE id = batch_id;
    
    SELECT COUNT(*) INTO processed_records 
    FROM students WHERE upload_batch_id = batch_id;
    
    SELECT COUNT(*) INTO error_count 
    FROM upload_errors WHERE upload_id = batch_id;
    
    -- Update upload_history with final statistics
    UPDATE upload_history 
    SET 
        records_processed = processed_records,
        status = CASE 
            WHEN error_count = 0 AND processed_records = total_records THEN 'completed'
            WHEN processed_records > 0 AND error_count > 0 THEN 'partial'
            WHEN processed_records = 0 THEN 'failed'
            ELSE 'completed'
        END,
        completed_at = NOW()
    WHERE id = batch_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN students.upload_batch_id IS 'References the upload batch this student was created from';
COMMENT ON FUNCTION update_upload_statistics() IS 'Automatically updates upload statistics when students are inserted';
COMMENT ON FUNCTION finalize_upload_batch(UUID) IS 'Finalizes an upload batch with final statistics and status';
