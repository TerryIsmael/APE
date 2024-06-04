import multer from 'multer';

const storage = multer.diskStorage({
    
    destination: (req, _, cb) => {
      cb(null, `uploads/${req.body.workspace}`);
    },

    filename: (req, _, cb) => {
      cb(null, req.params.itemId);
    }
  });
  
export const uploader = multer({
  storage:storage,
  fileFilter: (_, file, cb) => {
    if (file.originalname.includes('../')) {
      return 'El nombre del archivo no puede contener "../"';
    }
    return cb(null, true);
  }
});



